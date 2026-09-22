import { createPublicClient, http, keccak256 } from 'viem';
import { abi, address, type Registry } from '../../adapters/src/index.ts';
import { ProductError, type SourceBlock } from '../../domain/src/index.ts';
const queues = new Map<string, Promise<unknown>>();
export async function paced<T>(url: string, fn: () => Promise<T>): Promise<T> {
  const ms = Number(
    typeof process !== 'undefined' ? (process.env.EXITDRILL_RPC_INTERVAL_MS ?? 0) : 0,
  );
  if (!ms || new URL(url, 'http://localhost').hostname === '127.0.0.1') return fn();
  const key = new URL(url).origin;
  const prior = queues.get(key) ?? Promise.resolve();
  const task = prior
    .catch(() => {})
    .then(async () => {
      await new Promise((r) => setTimeout(r, ms));
      return fn();
    });
  queues.set(key, task);
  return task;
}
export const client = (url: string, timeout = 12000) =>
  createPublicClient({
    transport: (options) => {
      const transport = http(url, { timeout, retryCount: 0 })(options);
      return {
        ...transport,
        request: (args: any) => paced(url, () => transport.request(args)),
      } as typeof transport;
    },
  });
export type Client = ReturnType<typeof client>;
export interface Snapshot {
  owner: `0x${string}`;
  registry: Registry;
  sourceBlock: SourceBlock;
  sharesRaw: string;
  maxRedeemRaw: string;
  assetsRaw: string;
  nativeRaw: string;
  ownerCode: boolean;
}
export async function inspect(c: Client, r: Registry, ownerInput: string): Promise<Snapshot> {
  const owner = address(ownerInput);
  if (!r.enabled) throw new ProductError('UNSUPPORTED_TARGET', 'Adapter validation is incomplete.');
  if ((await c.getChainId()) !== r.chainId)
    throw new ProductError('SOURCE_BLOCK_MISMATCH', 'RPC returned a different network.');
  const b = await c.getBlock();
  const blockNumber = b.number;
  const read = (functionName: any, args?: any) =>
    c.readContract({ address: r.target, abi, functionName, args, blockNumber } as any);
  const [code, assetCode, ownerCode, asset, decimals, assetDecimals, shares, max, native] =
    await Promise.all([
      c.getCode({ address: r.target, blockNumber }),
      c.getCode({ address: r.asset, blockNumber }),
      c.getCode({ address: owner, blockNumber }),
      read('asset'),
      read('decimals'),
      c.readContract({ address: r.asset, abi, functionName: 'decimals', blockNumber }),
      read('balanceOf', [owner]),
      read('maxRedeem', [owner]),
      c.getBalance({ address: owner, blockNumber }),
    ]);
  if (
    !code ||
    code === '0x' ||
    keccak256(code) !== r.codeHash ||
    !assetCode ||
    keccak256(assetCode) !== r.assetCodeHash ||
    address(asset as string) !== address(r.asset) ||
    decimals !== r.decimals ||
    assetDecimals !== r.assetDecimals
  )
    throw new ProductError(
      'IDENTITY_CHANGED',
      'Contract identity differs from the reviewed registry.',
    );
  for (const dep of r.dependencies ?? []) {
    const code = await c.getCode({ address: dep.address, blockNumber });
    if (!code || keccak256(code) !== dep.codeHash)
      throw new ProductError('IDENTITY_CHANGED', 'A dependency identity changed.');
  }
  const assets = await read('previewRedeem', [shares]);
  await canonical(c, { number: blockNumber.toString(), hash: b.hash });
  return {
    owner,
    registry: r,
    sourceBlock: {
      chainId: r.chainId,
      number: blockNumber.toString(),
      hash: b.hash,
      timestamp: new Date(Number(b.timestamp) * 1000).toISOString(),
      observedAt: new Date().toISOString(),
    },
    sharesRaw: String(shares),
    maxRedeemRaw: String(max),
    assetsRaw: String(assets),
    nativeRaw: native.toString(),
    ownerCode: !!ownerCode && ownerCode !== '0x',
  };
}
export async function canonical(c: Client, b: { number: string; hash: string }) {
  if ((await c.getBlock({ blockNumber: BigInt(b.number) })).hash !== b.hash)
    throw new ProductError(
      'SOURCE_BLOCK_CHANGED',
      'The source block changed. Run a new inspection.',
    );
}
