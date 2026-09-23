import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { client, inspect, type Snapshot } from '../packages/chain/src/index.ts';
import { rehearse } from '../apps/worker/src/rehearse.ts';
import { buildPlan } from '../packages/adapters/src/index.ts';
import { guardedSend } from '../packages/adapters/src/wallet.ts';
const fixtures = JSON.parse(readFileSync('data/local/fixtures.json', 'utf8'));
const rpc = client('http://127.0.0.1:8545');
let snapshot: Snapshot;
beforeAll(async () => {
  snapshot = await inspect(rpc, fixtures.entries[0], fixtures.owner);
});
it('returns UNKNOWN, never PASS, when the provider disappears after inspection', async () => {
  const report = await rehearse(
    'rpc-outage',
    snapshot,
    '1000000000000000000',
    'http://127.0.0.1:1',
  );
  expect(report.verdict).toBe('UNKNOWN');
  expect(report.execution).toBeNull();
});
it('returns UNKNOWN for a source block hash changed after inspection', async () => {
  const report = await rehearse(
    'changed-source',
    {
      ...snapshot,
      sourceBlock: { ...snapshot.sourceBlock, hash: ('0x' + '0'.repeat(64)) as `0x${string}` },
    },
    '1000000000000000000',
    'http://127.0.0.1:8545',
  );
  expect(report.verdict).toBe('UNKNOWN');
  expect(report.execution).toBeNull();
});
it.each(['account', 'chain', 'revert'])(
  'never sends when %s changes during wallet preflight',
  async (mode) => {
    const plan = buildPlan(
      snapshot.registry,
      snapshot.owner,
      '1000000000000000000',
      snapshot.sourceBlock,
    );
    let checked = false;
    let sends = 0;
    const provider = {
      request: async (args: any) => {
        if (args.method === 'eth_sendTransaction') {
          sends++;
          throw Error('Should not send');
        }
        if (checked && mode === 'account' && args.method === 'eth_accounts')
          return ['0x0000000000000000000000000000000000000001'];
        if (checked && mode === 'chain' && args.method === 'eth_chainId') return '0x1';
        if (args.method === 'eth_call') {
          checked = true;
          if (mode === 'revert') throw Error('execution reverted');
        }
        return rpc.request(args);
      },
    };
    await expect(guardedSend(provider, plan, snapshot.registry, Date.now())).rejects.toThrow();
    expect(sends).toBe(0);
  },
);
