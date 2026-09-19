import { keccak256 } from 'viem';
import { verifyPlan, type Registry } from './index.ts';
import type { ExitPlan } from '../../domain/src/types.ts';
export async function guardedSend(
  provider: any,
  plan: ExitPlan,
  registry: Registry,
  preflightAt: number,
  beforeSend?: () => void,
) {
  if (plan.sourceChainId === 1 || registry.chainId === 1)
    throw Error('Mainnet broadcasting is disabled in this release.');
  if (!registry.signing || registry.environment !== 'LOCAL_FIXTURE' || registry.chainId !== 31337)
    throw Error('This deployment is not allowlisted for signing.');
  verifyPlan(plan, registry);
  if (Date.now() - preflightAt > 30000) throw Error('Preflight expired. Recheck before signing.');
  const [chain, accounts] = await Promise.all([
    provider.request({ method: 'eth_chainId' }),
    provider.request({ method: 'eth_accounts' }),
  ]);
  if (Number(chain) !== 31337 || accounts?.[0]?.toLowerCase() !== plan.owner.toLowerCase())
    throw Error('Wallet account or network changed. Recheck the plan.');
  const code = await provider.request({ method: 'eth_getCode', params: [plan.target, 'latest'] });
  if (!code || keccak256(code) !== registry.codeHash)
    throw Error('Wallet network contract identity changed.');
  await provider.request({
    method: 'eth_call',
    params: [{ from: plan.owner, to: plan.target, data: plan.calldata, value: '0x0' }, 'latest'],
  });
  const finalChain = await provider.request({ method: 'eth_chainId' });
  const finalAccounts = await provider.request({ method: 'eth_accounts' });
  if (
    Number(finalChain) !== 31337 ||
    finalAccounts?.[0]?.toLowerCase() !== plan.owner.toLowerCase() ||
    Date.now() - preflightAt > 30000
  )
    throw Error('Wallet or preflight changed. Recheck before signing.');
  beforeSend?.();
  return provider.request({
    method: 'eth_sendTransaction',
    params: [
      { from: plan.owner, to: plan.target, data: plan.calldata, value: '0x0', chainId: '0x7a69' },
    ],
  });
}
