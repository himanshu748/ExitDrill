import './env.ts';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import solc from 'solc-sdai';
import { keccak256, hashTypedData, parseAbi } from 'viem';
import { client, inspect } from '../packages/chain/src/index.ts';
import { rehearse } from '../apps/worker/src/rehearse.ts';
import type { Registry } from '../packages/adapters/src/index.ts';
const c = client(process.env.EXITDRILL_PRIMARY_RPC_URL || 'https://ethereum-rpc.publicnode.com');
const target = '0x83F20F44975D03b1b09e64809B757c47f942BEeA';
mkdirSync('work', { recursive: true });
mkdirSync('docs/evidence', { recursive: true });
const sourceURL =
  'https://raw.githubusercontent.com/sky-ecosystem/sdai/665879762f8b5df5d234463f45d1d6a49bd4fbeb/src/SavingsDai.sol';
const sourceResponse = await fetch(sourceURL);
if (!sourceResponse.ok) throw Error('Pinned source unavailable');
const source = await sourceResponse.text();
writeFileSync('work/SavingsDai.sol', source);
const holderResponse = await fetch(
  'https://eth.blockscout.com/api/v2/tokens/' + target + '/holders',
);
if (!holderResponse.ok) throw Error('Holder discovery unavailable');
writeFileSync('work/holders.json', await holderResponse.text());
const compiled = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: 'Solidity',
      sources: { 'main.sol': { content: source } },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: { '*': { '*': ['evm.deployedBytecode'], '': ['ast'] } },
      },
    }),
  ),
);
const output = compiled.contracts['main.sol'].SavingsDai.evm.deployedBytecode;
const b = await c.getBlock();
const actual = (await c.getCode({ address: target, blockNumber: b.number }))!;
const bytecode = Buffer.from(output.object, 'hex'),
  chaincode = Buffer.from(actual.slice(2), 'hex');
const vars: Record<number, string> = {};
function walk(v: any) {
  if (v && typeof v === 'object') {
    if (v.nodeType === 'VariableDeclaration') vars[v.id] = v.name;
    for (const x of Object.values(v)) walk(x);
  }
}
walk(compiled.sources['main.sol'].ast);
const immutables: Record<string, string> = {};
for (const [id, slots] of Object.entries(output.immutableReferences) as [string, any[]][]) {
  const values = slots.map((slot) =>
    chaincode.subarray(slot.start, slot.start + slot.length).toString('hex'),
  );
  if (new Set(values).size !== 1) throw Error('Immutable slots disagree');
  immutables[vars[Number(id)]] = '0x' + values[0];
  for (const slot of slots) {
    bytecode.fill(0, slot.start, slot.start + slot.length);
    chaincode.fill(0, slot.start, slot.start + slot.length);
  }
}
const strip = (v: Buffer) => v.subarray(0, v.length - 2 - v.readUInt16BE(v.length - 2));
if (!strip(bytecode).equals(strip(chaincode))) throw Error('SOURCE_RUNTIME_MISMATCH');
const known: Record<string, string> = {
  vat: '0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B',
  daiJoin: '0x9759A6Ac90977b93B58547b4A71c78317f391A28',
  dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  pot: '0x197E90f9FAD81970bA7976f33CbD77088E5D7cf7',
};
for (const [name, value] of Object.entries(known)) {
  if (BigInt(immutables[name]!) !== BigInt(value)) throw Error('IMMUTABLE_IDENTITY_MISMATCH');
}
if (BigInt(immutables.deploymentChainId!) !== 1n) throw Error('CHAIN_IMMUTABLE_MISMATCH');
const domain = await c.readContract({
  address: target,
  abi: parseAbi(['function DOMAIN_SEPARATOR() view returns(bytes32)']),
  functionName: 'DOMAIN_SEPARATOR',
  blockNumber: b.number,
});
if (domain !== immutables._DOMAIN_SEPARATOR) throw Error('DOMAIN_MISMATCH');
const dependencies = [];
for (const [name, a] of Object.entries(known)) {
  if (name === 'dai') continue;
  dependencies.push({
    address: a as `0x${string}`,
    codeHash: keccak256((await c.getCode({ address: a as `0x${string}`, blockNumber: b.number }))!),
  });
}
const asset = known.dai as `0x${string}`;
const registry: Registry = {
  id: 'sdai-mainnet',
  label: 'Savings DAI',
  enabled: true,
  chainId: 1,
  target,
  asset,
  symbol: 'sDAI',
  assetSymbol: 'DAI',
  decimals: 18,
  assetDecimals: 18,
  codeHash: keccak256(actual),
  assetCodeHash: keccak256((await c.getCode({ address: asset, blockNumber: b.number }))!),
  adapterVersion: '0.1.0-candidate-validation',
  environment: 'MAINNET_READ',
  signing: false,
  dependencies,
};
const holders = JSON.parse(readFileSync('work/holders.json', 'utf8')).items;
let owner: string | undefined;
for (const h of holders) {
  if (h.address.is_contract) continue;
  const a = h.address.hash as `0x${string}`;
  const bal = await c.readContract({
    address: target,
    abi: parseAbi(['function balanceOf(address) view returns(uint256)']),
    functionName: 'balanceOf',
    args: [a],
    blockNumber: b.number,
  });
  console.log('Holder candidate balance', bal.toString());
  if (bal > 0n && ((await c.getCode({ address: a, blockNumber: b.number })) ?? '0x') === '0x') {
    owner = a;
    break;
  }
}
if (!owner) throw Error('No positive EOA found in current holder sample');
const validation = {
  source:
    'https://github.com/sky-ecosystem/sdai/blob/665879762f8b5df5d234463f45d1d6a49bd4fbeb/src/SavingsDai.sol',
  compiler: solc.version(),
  method:
    'Compare compiled runtime after removing compiler metadata and validating immutable slots separately',
  runtimeMatch: true,
  immutables,
  block: { number: String(b.number), hash: b.hash },
  owner,
  registry,
};
writeFileSync('docs/evidence/sdai-source-validation.json', JSON.stringify(validation, null, 2));
const snapshot = await inspect(c, registry, owner);
console.log('Live positive shares:', snapshot.sharesRaw, 'at block', snapshot.sourceBlock.number);
const report = await rehearse(
  'sdai-integration-experiment',
  snapshot,
  '1000000000000000000',
  process.env.EXITDRILL_PRIMARY_RPC_URL || 'https://ethereum-rpc.publicnode.com',
  (stage) => console.log(stage),
  process.env.EXITDRILL_SECONDARY_RPC_URL || 'https://eth.drpc.org',
);
writeFileSync('docs/evidence/sdai-fork-experiment.json', JSON.stringify(report, null, 2));
console.log(report.verdict, report.reason);
// Experimental registry stays out of the public enabled registry until all gates are reviewed.
