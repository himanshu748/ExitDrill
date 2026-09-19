import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { inspect, client } from '../packages/chain/src/index.ts';
import { rehearse } from '../apps/worker/src/rehearse.ts';
const fixtures = JSON.parse(readFileSync('data/local/fixtures.json', 'utf8'));
const reports = [];
for (const r of fixtures.entries) {
  const s = await inspect(client('http://127.0.0.1:8545'), r, fixtures.owner);
  const result = await rehearse(randomUUID(), s, '10000000000000000000', 'http://127.0.0.1:8545');
  console.log(r.label, result.verdict, result.reason);
  reports.push(result);
  const expected = r.id === 'fixture-1' || r.id === 'fixture-3' ? 'BLOCKED' : 'PASS';
  if (result.verdict !== expected)
    throw Error(`${r.id}: expected ${expected}, got ${result.verdict}`);
}
mkdirSync('docs/evidence', { recursive: true });
writeFileSync('docs/evidence/fixture-rehearsals.json', JSON.stringify(reports, null, 2));
writeFileSync('data/local/replay.json', JSON.stringify(reports[0], null, 2));
