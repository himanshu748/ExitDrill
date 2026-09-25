import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
process.env.EXITDRILL_DB = 'data/local/test-' + randomUUID() + '.sqlite';
let app: any, headers: any, inspection: any;
beforeAll(async () => {
  const { createAPI } = await import('../apps/api/src/server.ts');
  app = await createAPI();
  const res = await app.inject({
    method: 'POST',
    url: '/v1/session',
    headers: { origin: 'http://localhost:4310' },
  });
  headers = { origin: 'http://localhost:4310', cookie: res.headers['set-cookie'].split(';')[0] };
  const registry = (await app.inject('/v1/registry')).json();
  inspection = (
    await app.inject({
      method: 'POST',
      url: '/v1/inspections',
      headers,
      payload: { owner: registry.owner, vaultId: 'fixture-0' },
    })
  ).json();
});
afterAll(async () => app.close());
it('rejects foreign origin', async () =>
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/v1/session',
        headers: { origin: 'https://evil.example' },
      })
    ).statusCode,
  ).toBe(403));
it('reads a real pinned inspection without a signature', () => {
  expect(inspection.sharesRaw).toBeTruthy();
  expect(inspection.sourceBlock.hash).toMatch(/^0x.{64}$/);
});
it('enforces strict request fields', async () =>
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/v1/inspections',
        headers,
        payload: { owner: inspection.owner, vaultId: 'fixture-0', receiver: inspection.owner },
      })
    ).statusCode,
  ).toBe(400));
it('rejects an amount above the inspected share balance before queueing', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/drills',
    headers: { ...headers, 'idempotency-key': randomUUID() },
    payload: {
      inspectionId: inspection.id,
      sharesRaw: String(BigInt(inspection.sharesRaw) + 1n),
    },
  });
  expect(res.statusCode).toBe(400);
  expect(res.json().code).toBe('INVALID_INPUT');
});
it('never rate limits drill status polling and limits each client separately', async () => {
  for (let n = 0; n < 100; n++)
    expect((await app.inject({ url: '/v1/drills/' + randomUUID(), headers })).statusCode).not.toBe(
      429,
    );
  const burst = async (ip: string) => {
    let last = 0;
    for (let n = 0; n < 91; n++)
      last = (await app.inject({ url: '/v1/registry', headers: { 'x-forwarded-for': ip } }))
        .statusCode;
    return last;
  };
  expect(await burst('203.0.113.1')).toBe(429);
  expect(
    (await app.inject({ url: '/v1/registry', headers: { 'x-forwarded-for': '203.0.113.2' } }))
      .statusCode,
  ).toBe(200);
});
it('reuses idempotent job and protects session scope', async () => {
  const payload = { inspectionId: inspection.id, sharesRaw: '1000000000000000000' };
  const h = { ...headers, 'idempotency-key': randomUUID() };
  const a = await app.inject({ method: 'POST', url: '/v1/drills', headers: h, payload });
  expect(a.statusCode).toBe(202);
  const b = await app.inject({ method: 'POST', url: '/v1/drills', headers: h, payload });
  expect(a.json().id).toBe(b.json().id);
  const conflict = await app.inject({
    method: 'POST',
    url: '/v1/drills',
    headers: h,
    payload: { ...payload, sharesRaw: '2' },
  });
  expect(conflict.statusCode).toBe(409);
  const stranger = await app.inject({
    method: 'POST',
    url: '/v1/session',
    headers: { origin: 'http://localhost:4310' },
  });
  expect(
    (
      await app.inject({
        url: '/v1/drills/' + a.json().id,
        headers: { cookie: stranger.headers['set-cookie'].split(';')[0] },
      })
    ).statusCode,
  ).toBe(403);
  await app.inject({ method: 'DELETE', url: '/v1/session', headers });
  expect((await app.inject({ url: '/v1/drills/' + a.json().id, headers })).statusCode).toBe(401);
});
