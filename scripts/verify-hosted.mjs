import { writeFileSync } from 'node:fs';
const base = process.env.EXITDRILL_DEMO_ORIGIN || 'https://jhahimanshu653--exitdrill-web.modal.run';
let cookie = '';
async function call(path, body, extra = {}) {
  const r = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { origin: base, 'content-type': 'application/json', cookie, ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });
  const c = r.headers.get('set-cookie');
  if (c) cookie = c.split(';')[0];
  if (!r.ok) throw Error(`${path}: ${r.status}`);
  return r.json();
}
await call('/v1/session', {});
const reg = await call('/v1/registry');
const evidence = [];
for (const [i, expected] of ['PASS', 'BLOCKED', 'PASS', 'BLOCKED'].entries()) {
  const snapshot = await call('/v1/inspections', { owner: reg.owner, vaultId: `fixture-${i}` });
  const job = await call(
    '/v1/drills',
    { inspectionId: snapshot.id, sharesRaw: '10000000000000000000' },
    { 'idempotency-key': crypto.randomUUID() },
  );
  for (let n = 0; n < 90; n++) {
    const result = await call('/v1/drills/' + job.id);
    if (result.receipt) {
      console.log(i, result.receipt.verdict, result.receipt.reason);
      evidence.push(result.receipt);
      if (result.receipt.verdict === 'PASS') {
        const zip = await fetch(base + '/v1/drills/' + job.id + '/kit', {
          method: 'POST',
          headers: { origin: base, cookie, 'content-type': 'application/json' },
          body: '{}',
        });
        if (!zip.ok) throw new Error('Hosted kit export: ' + zip.status + ' ' + (await zip.text()));
        const data = new Uint8Array(await zip.arrayBuffer());
        if (data[0] !== 80 || data[1] !== 75) throw new Error('Invalid kit ZIP');
        console.log('Kit export bytes', data.length);
      }
      if (result.receipt.verdict !== expected) throw Error('Unexpected hosted verdict');
      break;
    }
    if (n === 89) throw Error('Hosted job timeout');
    await new Promise((r) => setTimeout(r, 1200));
  }
}
writeFileSync(
  'docs/evidence/hosted-fixtures.json',
  JSON.stringify({ url: base, verifiedAt: new Date().toISOString(), receipts: evidence }, null, 2),
);
