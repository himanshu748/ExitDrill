import {
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  parseAbi,
  stringToHex,
  zeroAddress,
} from 'viem';
import { ProductError, parseDecimalInteger } from '../../domain/src/index.ts';
import type { ExitPlan, SourceBlock } from '../../domain/src/index.ts';
export const abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function asset() view returns (address)',
  'function decimals() view returns (uint8)',
  'function maxRedeem(address) view returns (uint256)',
  'function previewRedeem(uint256) view returns (uint256)',
  'function redeem(uint256,address,address) returns (uint256)',
  'event Withdraw(address indexed sender,address indexed receiver,address indexed owner,uint256 assets,uint256 shares)',
]);
export interface Registry {
  id: string;
  label: string;
  enabled: boolean;
  chainId: number;
  target: `0x${string}`;
  asset: `0x${string}`;
  symbol: string;
  assetSymbol: string;
  decimals: number;
  assetDecimals: number;
  codeHash: `0x${string}`;
  assetCodeHash: `0x${string}`;
  adapterVersion: string;
  environment: 'LOCAL_FIXTURE' | 'MAINNET_READ';
  signing: boolean;
  dependencies?: { address: `0x${string}`; codeHash: `0x${string}` }[];
}
export function address(input: string): `0x${string}` {
  if (!isAddress(input, { strict: true }))
    throw new ProductError(
      'INVALID_ADDRESS',
      'Enter a valid Ethereum address, including a correct checksum when mixed case.',
    );
  if (input.toLowerCase() === zeroAddress)
    throw new ProductError('ZERO_ADDRESS', 'The zero address cannot own this exit plan.');
  return getAddress(input);
}
export const registryDigest = (r: Registry) => keccak256(stringToHex(JSON.stringify(r)));
const fields = [
  'schemaVersion',
  'adapterId',
  'adapterVersion',
  'registryDigest',
  'sourceChainId',
  'sourceBlockNumber',
  'sourceBlockHash',
  'owner',
  'receiver',
  'target',
  'operation',
  'sharesRaw',
  'valueRaw',
  'calldata',
] as const;
export function digestExitPlan(p: Omit<ExitPlan, 'planDigest'>): `0x${string}` {
  const normalized = {
    ...p,
    owner: address(p.owner),
    receiver: address(p.receiver),
    target: address(p.target),
    sourceBlockHash: p.sourceBlockHash.toLowerCase(),
    calldata: p.calldata.toLowerCase(),
    registryDigest: p.registryDigest.toLowerCase(),
    sharesRaw: parseDecimalInteger(p.sharesRaw, 'shares').toString(),
    sourceBlockNumber: parseDecimalInteger(p.sourceBlockNumber, 'block').toString(),
  };
  return keccak256(stringToHex(JSON.stringify(fields.map((k) => [k, normalized[k]]))));
}
export function buildPlan(
  r: Registry,
  ownerInput: string,
  shares: string,
  b: SourceBlock,
): ExitPlan {
  const owner = address(ownerInput);
  if (!r.enabled)
    throw new ProductError(
      'UNSUPPORTED_TARGET',
      'This adapter has not passed its enablement gates.',
    );
  if (b.chainId !== r.chainId || !/^0x[0-9a-fA-F]{64}$/.test(b.hash))
    throw new ProductError('PLAN_MISMATCH', 'Source context does not match the registry.');
  if (parseDecimalInteger(shares, 'shares') <= 0n)
    throw new ProductError('INVALID_AMOUNT', 'Choose a positive share amount.');
  const p: Omit<ExitPlan, 'planDigest'> = {
    schemaVersion: 1,
    adapterId: 'erc4626-direct-redeem',
    adapterVersion: r.adapterVersion,
    registryDigest: registryDigest(r),
    sourceChainId: r.chainId,
    sourceBlockNumber: b.number,
    sourceBlockHash: b.hash,
    owner,
    receiver: owner,
    target: address(r.target),
    operation: 'redeem',
    sharesRaw: shares,
    valueRaw: '0',
    calldata: encodeFunctionData({
      abi,
      functionName: 'redeem',
      args: [BigInt(shares), owner, owner],
    }),
  };
  return { ...p, planDigest: digestExitPlan(p) };
}
export function verifyPlan(p: ExitPlan, r: Registry): ExitPlan {
  const rebuilt = buildPlan(r, p.owner, p.sharesRaw, {
    chainId: p.sourceChainId,
    number: p.sourceBlockNumber,
    hash: p.sourceBlockHash,
    timestamp: '',
    observedAt: '',
  });
  if (fields.some((k) => p[k] !== rebuilt[k]) || p.planDigest !== rebuilt.planDigest)
    throw new ProductError(
      'PLAN_MISMATCH',
      'Saved plan differs from the independently reconstructed transaction.',
    );
  return rebuilt;
}
