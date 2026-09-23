import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const base = process.env.EXITDRILL_DEMO_ORIGIN || 'https://jhahimanshu653--exitdrill-web.modal.run';
const count = Number(process.env.EXITDRILL_RUNS || 30);
const output = process.env.EXITDRILL_RELIABILITY_OUTPUT || 'docs/evidence/hosted-reliability.json';
let cookie = '';
const results = [];
const startedAt = new Date().toISOString();
async function call(path, body, headers = {}) {
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { origin: base, 'content-type': 'application/json', cookie, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  if (!response.ok)
    throw Error(`${path}: HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json();
}
function save() {
  const summarize = (rows) => {
    const times = rows
      .filter((r) => r.verdict === 'PASS')
      .map((r) => r.elapsedMs)
      .sort((a, b) => a - b);
    const percentile = (p) => (times.length ? times[Math.ceil(times.length * p) - 1] : null);
    return {
      attempts: rows.length,
      pass: times.length,
      failures: rows.filter((r) => r.verdict !== 'PASS').length,
      medianMs: percentile(0.5),
      p95Ms: percentile(0.95),
      maxMs: times.at(-1) ?? null,
    };
  };
  writeFileSync(
    output,
    JSON.stringify(
      {
        startedAt,
        updatedAt: new Date().toISOString(),
        url: base,
        plannedAttempts: count,
        method:
          'Sequential API journeys, fresh inspection each time; no retries. Latency includes inspection, queue, execution, and polling (2 second interval). Warm service after registry probe. No mainnet broadcast.',
        summary: summarize(results),
        byVault: Object.fromEntries(
          [...new Set(results.map((r) => r.vaultId))].map((id) => [
            id,
            summarize(results.filter((r) => r.vaultId === id)),
          ]),
        ),
        results,
      },
      null,
      2,
    ) + '\n',
  );
}
await call('/v1/session', {});
const registry = await call('/v1/registry');
for (let i = 0; i < count; i++) {
  const vaultId = i % 3 === 0 ? 'fixture-0' : 'sdai-mainnet';
  const start = performance.now();
  let row = { attempt: i + 1, vaultId, startedAt: new Date().toISOString() };
  try {
    const inspection = await call('/v1/inspections', {
      owner: vaultId === 'fixture-0' ? registry.owner : registry.exampleOwner,
      vaultId,
    });
    const job = await call(
      '/v1/drills',
      { inspectionId: inspection.id, sharesRaw: '1000000000000000000' },
      { 'idempotency-key': crypto.randomUUID() },
    );
    row.jobId = job.id;
    while (performance.now() - start < 240000) {
      const result = await call('/v1/drills/' + job.id);
      if (result.receipt) {
        row.verdict = result.receipt.verdict;
        row.reason = result.receipt.reason;
        row.receipt = result.receipt;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!row.verdict) throw Error('Journey exceeded 240 seconds');
  } catch (e) {
    row.verdict = 'ERROR';
    row.error = e.message;
  }
  row.elapsedMs = Math.round(performance.now() - start);
  results.push(row);
  save();
  console.log(`${i + 1}/${count} ${vaultId} ${row.verdict} ${row.elapsedMs}ms ${row.error || ''}`);
  await new Promise((r) => setTimeout(r, 2500));
}
if (results.some((r) => r.verdict !== 'PASS')) process.exitCode = 1;
