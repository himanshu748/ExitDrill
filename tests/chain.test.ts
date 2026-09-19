import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { inspect, client, canonical } from '../packages/chain/src/index.ts';
const f = JSON.parse(readFileSync('data/local/fixtures.json', 'utf8'));
it('rejects changed code identity', async () => {
  await expect(
    inspect(
      client('http://127.0.0.1:8545'),
      { ...f.entries[0], codeHash: '0x' + '0'.repeat(64) },
      f.owner,
    ),
  ).rejects.toMatchObject({ code: 'IDENTITY_CHANGED' });
});
it('rejects a reorged source block', async () => {
  await expect(
    canonical({ getBlock: async () => ({ hash: 'different' }) } as any, {
      number: '1',
      hash: 'original',
    }),
  ).rejects.toMatchObject({ code: 'SOURCE_BLOCK_CHANGED' });
});
it('does not turn transport failure into a zero position', async () => {
  await expect(inspect(client('http://127.0.0.1:1'), f.entries[0], f.owner)).rejects.toThrow();
});
it('distinguishes an actual zero position', async () => {
  const s = await inspect(
    client('http://127.0.0.1:8545'),
    f.entries[0],
    '0x0000000000000000000000000000000000000001',
  );
  expect(s.sharesRaw).toBe('0');
});
