import './env.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { keccak256, stringToHex } from 'viem';
import { inspect, client } from '../packages/chain/src/index.ts';
import { abi } from '../packages/adapters/src/index.ts';
import { rehearse } from '../apps/worker/src/rehearse.ts';
const proof = JSON.parse(readFileSync('docs/evidence/sdai-source-validation.json', 'utf8'));
const report = JSON.parse(readFileSync('docs/evidence/sdai-fork-experiment.json', 'utf8'));
if (!proof.runtimeMatch || report.verdict !== 'PASS') throw Error('Prior gates incomplete');
const r = {
  ...proof.registry,
  adapterVersion: '0.1.0',
  abiDigest: keccak256(stringToHex(JSON.stringify(abi))),
};
const secondary = process.env.EXITDRILL_SECONDARY_RPC_URL || 'https://eth.drpc.org';
const first = client(
  process.env.EXITDRILL_PRIMARY_RPC_URL || 'https://ethereum-rpc.publicnode.com',
);
const second = client(secondary);
const snapshot = await inspect(second, r, report.snapshot.owner);
const blockNumber = BigInt(snapshot.sourceBlock.number);
if ((await first.getBlock({ blockNumber })).hash !== snapshot.sourceBlock.hash)
  throw Error('Source block mismatch');
const fields = [
  ['balanceOf', [snapshot.owner], snapshot.sharesRaw],
  ['maxRedeem', [snapshot.owner], snapshot.maxRedeemRaw],
  ['previewRedeem', [BigInt(snapshot.sharesRaw)], snapshot.assetsRaw],
] as const;
for (const [functionName, args, expected] of fields) {
  const value = await first.readContract({
    address: r.target,
    abi,
    functionName,
    args,
    blockNumber,
  } as any);
  if (String(value) !== expected) throw Error('Critical observations disagree');
}
console.log(
  'Second RPC identity and critical observations match. Repeating fork against secondary provider.',
);
const repeat = await rehearse(
  'sdai-secondary-provider-rehearsal',
  snapshot,
  '1000000000000000000',
  secondary,
  (stage) => console.log(stage),
  process.env.EXITDRILL_PRIMARY_RPC_URL || 'https://ethereum-rpc.publicnode.com',
);
writeFileSync('docs/evidence/sdai-secondary-rehearsal.json', JSON.stringify(repeat, null, 2));
if (repeat.verdict !== 'PASS') throw Error(repeat.reason);
writeFileSync('registry/sdai-mainnet.validated.json', JSON.stringify(r, null, 2));
console.log(
  'sDAI enabled for inspection and fork rehearsal only. Mainnet broadcasting remains disabled.',
);
