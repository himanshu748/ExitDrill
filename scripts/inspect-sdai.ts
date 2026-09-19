import './env.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { keccak256, parseAbi, parseAbiItem } from 'viem';
import { client } from '../packages/chain/src/index.ts';
import { abi } from '../packages/adapters/src/index.ts';
const primary = process.env.EXITDRILL_PRIMARY_RPC_URL || 'https://ethereum-rpc.publicnode.com';
const secondary = process.env.EXITDRILL_SECONDARY_RPC_URL || 'https://eth.drpc.org';
const c = client(primary),
  d = client(secondary);
const b = await c.getBlock();
const target = '0x83F20F44975D03b1b09e64809B757c47f942BEeA' as const;
const read = (functionName: any, args?: any) =>
  c.readContract({
    address: target,
    abi: [
      ...abi,
      ...parseAbi([
        'function pot() view returns(address)',
        'function daiJoin() view returns(address)',
        'function vat() view returns(address)',
      ]),
    ],
    functionName,
    args,
    blockNumber: b.number,
  } as any);
const asset = (await read('asset')) as `0x${string}`;
const deps = [];
for (const name of ['pot', 'daiJoin', 'vat']) {
  const a = (await read(name)) as `0x${string}`;
  deps.push({
    name,
    address: a,
    codeHash: keccak256((await c.getCode({ address: a, blockNumber: b.number }))!),
  });
}
const agreement = (await d.getBlock({ blockNumber: b.number })).hash === b.hash;
let owner = process.env.EXITDRILL_INSPECT_OWNER as `0x${string}` | undefined;
if (!owner) {
  const logs = await c.getLogs({
    address: target,
    event: parseAbiItem('event Transfer(address indexed from,address indexed to,uint256 value)'),
    fromBlock: b.number - 100n,
    toBlock: b.number,
  });
  for (const l of logs.reverse()) {
    const candidate = l.args.to;
    if (
      candidate &&
      candidate !== '0x0000000000000000000000000000000000000000' &&
      ((await c.getCode({ address: candidate, blockNumber: b.number })) ?? '0x') === '0x' &&
      BigInt((await read('balanceOf', [candidate])) as bigint) > 0n
    ) {
      owner = candidate;
      break;
    }
  }
}
const observations = {
  observedAt: new Date().toISOString(),
  sourceBlock: { number: String(b.number), hash: b.hash, timestamp: String(b.timestamp) },
  target,
  asset,
  runtimeCodeHash: keccak256((await c.getCode({ address: target, blockNumber: b.number }))!),
  dependencies: deps,
  secondaryAgreement: agreement,
  owner: owner ?? null,
  sharesRaw: owner ? String(await read('balanceOf', [owner])) : null,
  maxRedeemRaw: owner ? String(await read('maxRedeem', [owner])) : null,
  adapterEnabled: false,
  reason: 'Source-to-runtime verification and genuine fork gates still required.',
};
mkdirSync('docs/evidence', { recursive: true });
writeFileSync('docs/evidence/sdai-observations.json', JSON.stringify(observations, null, 2));
console.log(JSON.stringify(observations, null, 2));
