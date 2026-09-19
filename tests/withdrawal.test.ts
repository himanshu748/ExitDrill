import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { client, inspect } from '../packages/chain/src/index.ts';
import { verifyWithdrawal } from '../packages/chain/src/verify-withdrawal.ts';
import { buildPlan, abi } from '../packages/adapters/src/index.ts';
import { guardedSend } from '../packages/adapters/src/wallet.ts';
it('submits only an allowlisted local transaction and verifies actual receipt outcomes', async () => {
  const f = JSON.parse(readFileSync('data/local/fixtures.json', 'utf8'));
  const r = f.entries[0];
  const c = client('http://127.0.0.1:8545');
  const snapshotId = await c.request({ method: 'evm_snapshot', params: [] } as any);
  try {
    const s = await inspect(c, r, f.owner);
    const plan = buildPlan(r, f.owner, '1000000000000000000', s.sourceBlock);
    const before = {
      shares: s.sharesRaw,
      assets: String(
        await c.readContract({ address: r.asset, abi, functionName: 'balanceOf', args: [s.owner] }),
      ),
      supply: String(await c.readContract({ address: r.target, abi, functionName: 'totalSupply' })),
    };
    const provider = { request: (args: any) => c.request(args) };
    const hash = await guardedSend(provider, plan, r, Date.now());
    await c.waitForTransactionReceipt({ hash });
    const result = await verifyWithdrawal(c, hash, plan, r, before);
    expect(result.status).toBe('VERIFIED');
    expect(result.assetsRaw).toBe('1000000000000000000');
  } finally {
    await c.request({ method: 'evm_revert', params: [snapshotId] } as any);
  }
});
