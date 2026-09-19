import { decodeEventLog } from 'viem';
import { abi, type Registry } from '../../adapters/src/index.ts';
import type { Client } from './index.ts';
import type { ExitPlan } from '../../domain/src/types.ts';
export async function verifyWithdrawal(
  c: Client,
  hash: `0x${string}`,
  plan: ExitPlan,
  r: Registry,
  before: { shares: string; assets: string; supply: string },
) {
  const receipt = await c.getTransactionReceipt({ hash });
  if (receipt.status !== 'success')
    return { status: 'REVERTED', message: 'The included test transaction reverted.' };
  const tx = await c.getTransaction({ hash });
  if (
    tx.from.toLowerCase() !== plan.owner.toLowerCase() ||
    tx.to?.toLowerCase() !== plan.target.toLowerCase() ||
    tx.input !== plan.calldata ||
    tx.value !== 0n
  )
    throw Error('Transaction differs from the reviewed plan.');
  const read = (address: `0x${string}`, functionName: any, args?: any) =>
    c.readContract({ address, abi, functionName, args, blockNumber: receipt.blockNumber } as any);
  const after = {
    shares: BigInt((await read(r.target, 'balanceOf', [plan.owner])) as bigint),
    assets: BigInt((await read(r.asset, 'balanceOf', [plan.owner])) as bigint),
    supply: BigInt((await read(r.target, 'totalSupply')) as bigint),
  };
  const events = receipt.logs
    .filter((l) => l.address.toLowerCase() === r.target.toLowerCase())
    .flatMap((l) => {
      try {
        const e = decodeEventLog({ abi, data: l.data, topics: l.topics });
        return e.eventName === 'Withdraw' ? [e.args] : [];
      } catch {
        return [];
      }
    });
  const e = events[0];
  if (
    events.length !== 1 ||
    !e ||
    e.owner.toLowerCase() !== plan.owner.toLowerCase() ||
    e.sender.toLowerCase() !== plan.owner.toLowerCase() ||
    e.receiver.toLowerCase() !== plan.receiver.toLowerCase() ||
    e.shares !== BigInt(plan.sharesRaw) ||
    BigInt(before.shares) - after.shares !== e.shares ||
    after.assets - BigInt(before.assets) !== e.assets ||
    BigInt(before.supply) - after.supply !== e.shares
  )
    throw Error('Included transaction still lacks consistent outcome evidence.');
  return {
    status: 'VERIFIED',
    message:
      'Test withdrawal included and verified against its event, share balance, asset balance, and supply change.',
    assetsRaw: e.assets.toString(),
    blockNumber: receipt.blockNumber.toString(),
  };
}
