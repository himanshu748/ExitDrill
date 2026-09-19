import { readFileSync, writeFileSync } from 'node:fs';
import { numberToHex } from 'viem';
import { inspect, client } from '../packages/chain/src/index.ts';
import { rehearse } from '../apps/worker/src/rehearse.ts';
const f = JSON.parse(readFileSync('data/local/fixtures.json', 'utf8'));
const c = client('http://127.0.0.1:8545');
const original = await c.getBalance({ address: f.owner });
try {
  await c.request({ method: 'anvil_setBalance', params: [f.owner, '0x0'] } as any);
  const s = await inspect(c, f.entries[0], f.owner);
  const report = await rehearse(
    'local-zero-native-gas',
    s,
    '1000000000000000000',
    'http://127.0.0.1:8545',
  );
  if (
    report.verdict !== 'PASS' ||
    report.gasAssessment !== 'INSUFFICIENT' ||
    report.adjustments[0]?.originalRaw !== '0'
  )
    throw Error('Gas disclosure invariant failed');
  writeFileSync('docs/evidence/insufficient-gas.json', JSON.stringify(report, null, 2));
  console.log(
    'Zero-native-gas fixture: execution PASS; original gas INSUFFICIENT; synthetic funding disclosed.',
  );
} finally {
  await c.request({ method: 'anvil_setBalance', params: [f.owner, numberToHex(original)] } as any);
}
