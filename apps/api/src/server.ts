import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { db, session, findSession, digest } from './store.ts';
import { inspect, client } from '../../../packages/chain/src/index.ts';
import { address } from '../../../packages/adapters/src/index.ts';
import { parseDecimalInteger } from '../../../packages/domain/src/index.ts';
import { rehearse } from '../../worker/src/rehearse.ts';
import { exportKit } from '../../../packages/evidence/src/export.ts';
if (existsSync('.env')) process.loadEnvFile('.env');
const allowed = process.env.EXITDRILL_ORIGIN ?? 'http://localhost:4310';
const fixturePath = 'data/local/fixtures.json';
const fixtures = () => {
  const local = existsSync(fixturePath)
    ? JSON.parse(readFileSync(fixturePath, 'utf8'))
    : { owner: null, entries: [] };
  const mainnet = 'registry/sdai-mainnet.validated.json';
  if (existsSync(mainnet)) local.entries.push(JSON.parse(readFileSync(mainnet, 'utf8')));
  return local;
};
const upstream = (r: any) =>
  r.environment === 'LOCAL_FIXTURE'
    ? 'http://127.0.0.1:8545'
    : process.env.EXITDRILL_PRIMARY_RPC_URL || 'https://ethereum-rpc.publicnode.com';
export async function createAPI() {
  const app = Fastify({ bodyLimit: 16384, logger: false });
  await app.register(cookie);
  await app.register(rateLimit, { max: 90, timeWindow: '1 minute' });
  app.addHook('onRequest', async (req, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== allowed)
      return reply.code(403).send({
        code: 'ORIGIN_DENIED',
        message: 'Use the same-origin interface.',
        retryable: false,
        requestId: req.id,
      });
  });
  app.setErrorHandler((error: any, req, reply) => {
    const status =
      error.statusCode ??
      (error.name === 'ProductError'
        ? 400
        : error instanceof z.ZodError
          ? 400
          : error.code?.startsWith('FST_')
            ? 400
            : 503);
    reply.code(status).send({
      code: error.safeCode ?? (status === 400 ? 'INVALID_INPUT' : 'INFRASTRUCTURE_UNAVAILABLE'),
      message:
        error.safeMessage ??
        (status === 400
          ? 'Check the address, share amount, and requested fields.'
          : 'Required infrastructure is unavailable. Your input has been preserved.'),
      retryable: status === 503,
      requestId: req.id,
    });
  });
  const fail = (status: number, code: string, message: string): never => {
    throw Object.assign(Error(message), {
      statusCode: status,
      safeCode: code,
      safeMessage: message,
    });
  };
  const own = (req: any) => {
    const s = findSession(req.cookies.exitdrill);
    if (!s) fail(401, 'SESSION_REQUIRED', 'Start a new anonymous session.');
    return s!.id;
  };
  const job = (req: any) => {
    const sid = own(req);
    const row = db
      .prepare('SELECT * FROM jobs WHERE id=? AND session=?')
      .get(req.params.id, sid) as any;
    if (!row) fail(403, 'ACCESS_DENIED', 'This record is not available in your session.');
    return row;
  };
  app.get('/health/live', async () => ({ status: 'ok' }));
  app.post('/v1/session', async (req, reply) => {
    const existing = findSession(req.cookies.exitdrill);
    if (existing) return { expiresIn: 86400 };
    const s = session();
    reply.setCookie('exitdrill', s.token, {
      httpOnly: true,
      secure: allowed.startsWith('https:'),
      sameSite: 'strict',
      path: '/',
      maxAge: 86400,
    });
    return { expiresIn: 86400 };
  });
  app.delete('/v1/session', async (req, reply) => {
    db.prepare('DELETE FROM sessions WHERE id=?').run(own(req));
    reply.clearCookie('exitdrill', { path: '/' });
    return { deleted: true };
  });
  app.get('/v1/registry', async () => ({
    ...fixtures(),
    exampleOwner: existsSync('registry/sdai-mainnet.validated.json')
      ? JSON.parse(readFileSync('docs/evidence/sdai-secondary-rehearsal.json', 'utf8')).snapshot
          .owner
      : null,
    candidate: {
      label: 'Savings DAI · Ethereum',
      enabled: existsSync('registry/sdai-mainnet.validated.json'),
      reason: existsSync('registry/sdai-mainnet.validated.json')
        ? 'Validated for read-only inspection and isolated fork rehearsal.'
        : 'Mainnet integration gates are incomplete.',
    },
  }));
  app.post('/v1/inspections', async (req) => {
    const sid = own(req);
    const input = z
      .object({ owner: z.string().max(42), vaultId: z.string().max(80) })
      .strict()
      .parse(req.body);
    try {
      address(input.owner);
    } catch (e: any) {
      fail(400, e.code, e.message);
    }
    const r = fixtures().entries.find((r: any) => r.id === input.vaultId);
    if (!r) fail(422, 'UNSUPPORTED_TARGET', 'Choose an enabled vault from the registry.');
    let snapshot;
    try {
      snapshot = await inspect(client(upstream(r)), r, input.owner);
    } catch (e: any) {
      fail(
        e.code === 'IDENTITY_CHANGED' ? 422 : 503,
        e.code ?? 'PROVIDER_UNAVAILABLE',
        e.code === 'IDENTITY_CHANGED'
          ? e.message
          : 'The RPC could not provide a consistent snapshot. No exit conclusion is available.',
      );
    }
    const id = randomUUID();
    db.prepare('INSERT INTO inspections VALUES(?,?,?,?)').run(
      id,
      sid,
      JSON.stringify(snapshot),
      Date.now(),
    );
    return { id, ...snapshot };
  });
  app.post('/v1/drills', async (req, reply) => {
    const sid = own(req);
    const input = z
      .object({
        inspectionId: z.string().uuid(),
        sharesRaw: z.string().regex(/^[1-9][0-9]{0,77}$/),
      })
      .strict()
      .parse(req.body);
    parseDecimalInteger(input.sharesRaw, 'shares');
    const idem = z.string().min(8).max(100).parse(req.headers['idempotency-key']);
    const hash = digest(JSON.stringify(input));
    const previous = db
      .prepare('SELECT * FROM jobs WHERE session=? AND idem=?')
      .get(sid, idem) as any;
    if (previous) {
      if (previous.request !== hash)
        fail(
          409,
          'IDEMPOTENCY_CONFLICT',
          'That request key was already used for a different plan.',
        );
      return reply.code(202).send({ id: previous.id, status: previous.status });
    }
    const inspection = db
      .prepare('SELECT * FROM inspections WHERE id=? AND session=?')
      .get(input.inspectionId, sid) as any;
    if (!inspection) fail(403, 'ACCESS_DENIED', 'Inspection is not available in your session.');
    if (Date.now() - inspection.created > 60000)
      fail(410, 'INSPECTION_EXPIRED', 'Inspect the position again before starting a new drill.');
    const n = db
      .prepare("SELECT count(*) n FROM jobs WHERE status NOT IN ('COMPLETED','FAILED_UNKNOWN')")
      .get() as any;
    const active = db
      .prepare(
        "SELECT id FROM jobs WHERE session=? AND status NOT IN ('COMPLETED','FAILED_UNKNOWN')",
      )
      .get(sid);
    if (n.n >= 10 || active)
      fail(429, 'QUEUE_FULL', 'A rehearsal is already running or the queue is full.');
    const id = randomUUID();
    db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?,?)').run(
      id,
      sid,
      input.inspectionId,
      input.sharesRaw,
      idem,
      hash,
      'QUEUED',
      '[]',
      null,
      Date.now(),
    );
    return reply.code(202).send({ id, status: 'QUEUED' });
  });
  app.get('/v1/drills/:id', async (req) => {
    const j = job(req);
    return {
      id: j.id,
      status: j.status,
      events: JSON.parse(j.events),
      receipt: j.receipt ? JSON.parse(j.receipt) : null,
    };
  });
  app.get('/v1/drills/:id/receipt', async (req) => {
    const j = job(req);
    if (!j.receipt) fail(409, 'NOT_COMPLETE', 'Evidence is still being collected.');
    return JSON.parse(j.receipt);
  });
  app.post('/v1/drills/:id/kit', async (req, reply) => {
    const j = job(req);
    if (!j.receipt) fail(409, 'NOT_COMPLETE', 'Wait for a completed report.');
    const zip = await exportKit(JSON.parse(j.receipt));
    reply
      .header('Content-Type', 'application/zip')
      .header(
        'Content-Disposition',
        `attachment; filename="exitdrill-kit-${j.id.slice(0, 8)}.zip"`,
      );
    return reply.send(Buffer.from(zip));
  });
  app.get('/v1/replay', async () => {
    const real = 'docs/evidence/sdai-fork-experiment.json';
    const path =
      existsSync(real) && JSON.parse(readFileSync(real, 'utf8')).verdict === 'PASS'
        ? real
        : 'data/local/replay.json';
    if (!existsSync(path))
      fail(
        503,
        'NO_RECORDED_DEMO',
        'Run the fixture verification to generate a real recorded demo.',
      );
    const r = JSON.parse(readFileSync(path, 'utf8'));
    return { ...r, sourceMode: 'RECORDED_REPLAY' };
  });
  let busy = false;
  // A crashed process never resumes an uncertain execution against shared mutable state.
  for (const j of db
    .prepare("SELECT * FROM jobs WHERE status NOT IN ('QUEUED','COMPLETED','FAILED_UNKNOWN')")
    .all() as any[]) {
    const i = db.prepare('SELECT data FROM inspections WHERE id=?').get(j.inspection) as any;
    const s = JSON.parse(i.data);
    const r = {
      schemaVersion: 1,
      id: j.id,
      createdAt: new Date().toISOString(),
      verdict: 'UNKNOWN',
      reason: 'Worker interrupted before all evidence was persisted.',
      evidenceLevel: 'READS_ONLY',
      environment: s.registry.environment,
      snapshot: s,
      plan: null,
      steps: JSON.parse(j.events),
      adjustments: [],
      execution: null,
      balances: null,
      limitations: ['Interrupted attempt; no successful execution is asserted.'],
    };
    db.prepare("UPDATE jobs SET status='FAILED_UNKNOWN',receipt=? WHERE id=?").run(
      JSON.stringify(r),
      j.id,
    );
  }
  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const j = db
        .prepare("SELECT * FROM jobs WHERE status='QUEUED' ORDER BY created LIMIT 1")
        .get() as any;
      if (!j) return;
      db.prepare("UPDATE jobs SET status='VALIDATING' WHERE id=? AND status='QUEUED'").run(j.id);
      const i = db.prepare('SELECT data FROM inspections WHERE id=?').get(j.inspection) as any;
      if (!i) return;
      const s = JSON.parse(i.data);
      const events: any[] = [];
      const r = await rehearse(
        j.id,
        s,
        j.shares,
        upstream(s.registry),
        (stage) => {
          events.push({ stage, at: new Date().toISOString() });
          db.prepare('UPDATE jobs SET status=?,events=? WHERE id=?').run(
            stage,
            JSON.stringify(events),
            j.id,
          );
        },
        s.registry.chainId === 1
          ? process.env.EXITDRILL_SECONDARY_RPC_URL || 'https://eth.drpc.org'
          : undefined,
      );
      db.prepare("UPDATE jobs SET status='COMPLETED',receipt=? WHERE id=? AND receipt IS NULL").run(
        JSON.stringify(r),
        j.id,
      );
    } finally {
      busy = false;
    }
  }, 300);
  timer.unref();
  app.addHook('onClose', async () => clearInterval(timer));
  return app;
}
if (process.argv[1]?.endsWith('server.ts')) {
  const app = await createAPI();
  await app.listen({ port: 4311, host: '127.0.0.1' });
  console.log('ExitDrill API on loopback port 4311');
}
