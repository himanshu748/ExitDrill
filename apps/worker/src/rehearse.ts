import { decodeEventLog, numberToHex, parseEther } from 'viem';
import { abi, buildPlan, verifyPlan } from '../../../packages/adapters/src/index.ts';
import { canonical, client, type Snapshot } from '../../../packages/chain/src/index.ts';
import { readGateway } from './gateway.ts';
import { startAnvil } from './anvil.ts';
import type { ExitPlan, Verdict } from '../../../packages/domain/src/index.ts';
export interface Report {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  verdict: Verdict;
  reason: string;
  evidenceLevel: 'READS_ONLY' | 'CALL_PREFLIGHT' | 'FORK_EXECUTED';
  environment: 'LOCAL_FIXTURE' | 'MAINNET_FORK';
  sourceMode: 'LIVE_GENERATED' | 'RECORDED_REPLAY';
  snapshot: Snapshot;
  estimatedAssetsRaw?: string;
  plan: ExitPlan | null;
  steps: { stage: string; at: string }[];
  adjustments: any[];
  gasAssessment: string;
  execution: any | null;
  balances: any | null;
  limitations: string[];
}
export async function rehearse(
  id: string,
  s: Snapshot,
  shares: string,
  upstream: string,
  stage: (s: string) => void = () => {},
  secondary?: string,
): Promise<Report> {
  const r: Report = {
    schemaVersion: 1,
    id,
    createdAt: new Date().toISOString(),
    verdict: 'UNKNOWN',
    reason: 'Required evidence is incomplete.',
    evidenceLevel: 'READS_ONLY',
    environment: s.registry.environment === 'LOCAL_FIXTURE' ? 'LOCAL_FIXTURE' : 'MAINNET_FORK',
    sourceMode: 'LIVE_GENERATED',
    snapshot: s,
    plan: null,
    steps: [],
    adjustments: [],
    gasAssessment: 'UNKNOWN',
    execution: null,
    balances: null,
    limitations: [
      'Historical execution does not guarantee a future withdrawal.',
      'A public-address rehearsal does not prove wallet control.',
      'Mainnet broadcasting is disabled in this release.',
    ],
  };
  const step = (name: string) => {
    r.steps.push({ stage: name, at: new Date().toISOString() });
    stage(name);
  };
  let gateway: Awaited<ReturnType<typeof readGateway>> | undefined;
  let fork: Awaited<ReturnType<typeof startAnvil>> | undefined;
  try {
    step('Validate position');
    if (s.ownerCode) {
      r.verdict = 'UNSUPPORTED';
      r.reason = 'Owners with account code are outside v0 execution coverage.';
      return r;
    }
    if (BigInt(s.sharesRaw) === 0n) {
      r.verdict = 'NO_POSITION';
      r.reason = 'No shares found in this supported vault.';
      return r;
    }
    r.plan = buildPlan(s.registry, s.owner, shares, s.sourceBlock);
    verifyPlan(r.plan, s.registry);
    if (BigInt(shares) > BigInt(s.sharesRaw) || BigInt(shares) > BigInt(s.maxRedeemRaw)) {
      r.verdict = 'BLOCKED';
      r.reason = 'Requested shares exceed the observed redemption limit.';
      return r;
    }
    const live = client(upstream);
    await canonical(live, s.sourceBlock);
    if (s.registry.chainId === 1) {
      if (!secondary) throw Error('SECONDARY_RPC_REQUIRED');
      const second = client(secondary);
      if ((await second.getChainId()) !== 1) throw Error('SOURCE_BLOCK_MISMATCH');
      await canonical(second, s.sourceBlock);
    }
    step('Prepare isolated fork');
    gateway = await readGateway(upstream);
    fork = await startAnvil({ url: gateway.url, block: s.sourceBlock.number });
    const c = fork.c;
    const request = (method: string, params: any[]) => c.request({ method, params } as any);
    const read = (target: `0x${string}`, functionName: any, args?: any) =>
      c.readContract({ address: target, abi, functionName, args } as any);
    const before = {
      shares: String(await read(s.registry.target, 'balanceOf', [s.owner])),
      assets: String(await read(s.registry.asset, 'balanceOf', [s.owner])),
      supply: String(await read(s.registry.target, 'totalSupply')),
    };
    await request('anvil_impersonateAccount', [s.owner]);
    const tx = { from: s.owner, to: r.plan.target, data: r.plan.calldata, value: '0x0' };
    // Funding is only on the private fork, never on the source provider.
    if (BigInt(s.nativeRaw) < parseEther('10')) {
      await request('anvil_setBalance', [s.owner, numberToHex(parseEther('10'))]);
      r.adjustments.push({
        type: 'NATIVE_GAS_FUNDING',
        originalRaw: s.nativeRaw,
        simulatedRaw: parseEther('10').toString(),
        reason: 'Isolate contract behavior from gas affordability.',
      });
    }
    r.estimatedAssetsRaw = String(await read(s.registry.target, 'previewRedeem', [BigInt(shares)]));
    let gas: bigint;
    try {
      gas = await c.estimateGas({
        account: s.owner,
        to: r.plan.target,
        data: r.plan.calldata,
        value: 0n,
      });
    } catch (e: any) {
      const reverted =
        e?.walk?.((x: any) => x?.name === 'ExecutionRevertedError') ||
        /revert/i.test(e?.shortMessage ?? '');
      r.verdict = reverted ? 'BLOCKED' : 'UNKNOWN';
      r.reason = reverted
        ? 'The exact redemption call reverted in the private fork.'
        : 'Gas estimation was interrupted; no contract conclusion is available.';
      r.evidenceLevel = 'CALL_PREFLIGHT';
      return r;
    }
    const gasLimit = (gas * 120n) / 100n;
    const fee = await c.getGasPrice();
    r.gasAssessment = BigInt(s.nativeRaw) >= gasLimit * fee ? 'SUFFICIENT' : 'INSUFFICIENT';
    step('Execute exact redemption');
    const hash = (await request('eth_sendTransaction', [
      { ...tx, gas: numberToHex(gasLimit) },
    ])) as `0x${string}`;
    const receipt = await c.waitForTransactionReceipt({ hash, timeout: 20000 });
    r.evidenceLevel = 'FORK_EXECUTED';
    const block = await c.getBlock({ blockNumber: receipt.blockNumber });
    r.execution = {
      chainId: 31337,
      transactionHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      blockHash: receipt.blockHash,
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      status: receipt.status,
      gasUsed: receipt.gasUsed.toString(),
      gasLimit: gasLimit.toString(),
      feeEstimateRaw: fee.toString(),
    };
    if (receipt.status !== 'success') {
      r.verdict = 'BLOCKED';
      r.reason = 'The redemption transaction reverted in the private fork.';
      return r;
    }
    step('Verify balances and event');
    const after = {
      shares: String(await read(s.registry.target, 'balanceOf', [s.owner])),
      assets: String(await read(s.registry.asset, 'balanceOf', [s.owner])),
      supply: String(await read(s.registry.target, 'totalSupply')),
    };
    const events = receipt.logs
      .filter((x) => x.address.toLowerCase() === s.registry.target.toLowerCase())
      .flatMap((log) => {
        try {
          const e = decodeEventLog({ abi, data: log.data, topics: log.topics });
          return e.eventName === 'Withdraw' ? [e.args] : [];
        } catch {
          return [];
        }
      });
    const e = events[0];
    r.balances = {
      before,
      after,
      observedAssetsRaw: (BigInt(after.assets) - BigInt(before.assets)).toString(),
    };
    if (
      events.length !== 1 ||
      !e ||
      e.owner.toLowerCase() !== s.owner.toLowerCase() ||
      e.receiver.toLowerCase() !== s.owner.toLowerCase() ||
      e.sender.toLowerCase() !== s.owner.toLowerCase() ||
      e.shares !== BigInt(shares) ||
      BigInt(before.shares) - BigInt(after.shares) !== BigInt(shares) ||
      BigInt(after.assets) - BigInt(before.assets) !== e.assets ||
      BigInt(before.supply) - BigInt(after.supply) !== BigInt(shares)
    )
      throw Error('OUTCOME_INVARIANT_FAILED');
    await canonical(live, s.sourceBlock);
    if (secondary) await canonical(client(secondary), s.sourceBlock);
    r.verdict = 'PASS';
    r.reason =
      'The exact redemption executed and its share, asset, supply, and withdrawal-event checks passed.';
    step('Evidence complete');
  } catch (e: any) {
    r.verdict = 'UNKNOWN';
    r.reason = ['SOURCE_BLOCK_CHANGED', 'SOURCE_BLOCK_MISMATCH', 'IDENTITY_CHANGED'].includes(
      e?.code,
    )
      ? e.message
      : [
            'SECONDARY_RPC_REQUIRED',
            'OUTCOME_INVARIANT_FAILED',
            'ANVIL_UNAVAILABLE',
            'ANVIL_TIMEOUT',
          ].includes(e?.message)
        ? e.message
        : 'The rehearsal was interrupted. Required evidence could not be verified.';
  } finally {
    fork?.stop();
    gateway?.stop();
  }
  return r;
}
