import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createWalletClient, http, keccak256, parseEther } from 'viem';
import { client } from '../packages/chain/src/index.ts';
import type { Registry } from '../packages/adapters/src/index.ts';
export async function deployFixtures(url: string) {
  const c = client(url);
  if ((await c.getChainId()) !== 31337) throw Error('Fixtures require local chain 31337');
  const w = createWalletClient({ transport: http(url) });
  const [owner] = await w.getAddresses();
  if (!owner) throw Error('Local development account unavailable');
  const contracts = JSON.parse(readFileSync('artifacts/contracts.json', 'utf8'));
  const deploy = async (name: string, args: any[]) => {
    const a = contracts[name];
    const hash = await w.deployContract({
      account: owner,
      chain: null,
      abi: a.abi,
      bytecode: `0x${a.evm.bytecode.object}`,
      args,
    });
    const receipt = await c.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) throw Error('Deployment failed');
    return receipt.contractAddress;
  };
  const asset = await deploy('TestAsset', []);
  const entries: Registry[] = [];
  for (const [mode, label] of [
    'Normal exit',
    'Redemption restricted',
    'Limited redemption',
    'Execution reverts',
  ].entries()) {
    const target = await deploy('DrillVault', [asset, BigInt(mode)]);
    for (const [address, contract, fn, args] of [
      [asset, 'TestAsset', 'approve', [target, parseEther('1000')]],
      [target, 'DrillVault', 'deposit', [parseEther('1000'), owner]],
    ] as const) {
      const hash = await w.writeContract({
        account: owner,
        chain: null,
        address,
        abi: contracts[contract].abi,
        functionName: fn,
        args,
      });
      await c.waitForTransactionReceipt({ hash });
    }
    entries.push({
      id: `fixture-${mode}`,
      label,
      enabled: true,
      chainId: 31337,
      target,
      asset,
      symbol: 'tSHARE',
      assetSymbol: 'tDAI',
      decimals: 18,
      assetDecimals: 18,
      codeHash: keccak256((await c.getCode({ address: target }))!),
      assetCodeHash: keccak256((await c.getCode({ address: asset }))!),
      adapterVersion: '0.1.0',
      environment: 'LOCAL_FIXTURE',
      signing: true,
    });
  }
  return { owner, entries, createdAt: new Date().toISOString() };
}
if (process.argv[1]?.endsWith('fixtures.ts')) {
  const result = await deployFixtures('http://127.0.0.1:8545');
  mkdirSync('data/local', { recursive: true });
  writeFileSync('data/local/fixtures.json', JSON.stringify(result, null, 2));
  console.log('Local fixture deployment recorded:', result.owner);
}
