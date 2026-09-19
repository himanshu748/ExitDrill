export type Verdict = 'PASS' | 'BLOCKED' | 'UNKNOWN' | 'UNSUPPORTED' | 'NO_POSITION';

export type EvidenceLevel = 'READS_ONLY' | 'CALL_PREFLIGHT' | 'FORK_EXECUTED' | 'TESTNET_MINED';

export type Environment =
  'MAINNET_READ' | 'MAINNET_FORK' | 'TESTNET' | 'LOCAL_FIXTURE' | 'RECORDED_REPLAY';

export type GasAssessment = 'SUFFICIENT' | 'INSUFFICIENT' | 'UNKNOWN' | 'NOT_CHECKED';

export type SigningPolicy = 'DISABLED_MAINNET' | 'DISABLED_WATCH_ONLY' | 'TEST_DEPLOYMENT_ONLY';

export type ObservationResult = 'PASS' | 'FAIL' | 'UNKNOWN';

export interface SourceBlock {
  chainId: number;
  number: string;
  hash: `0x${string}`;
  timestamp: string;
  observedAt: string;
}

export interface ExitPlan {
  schemaVersion: 1;
  adapterId: string;
  adapterVersion: string;
  registryDigest: string;
  sourceChainId: number;
  sourceBlockNumber: string;
  sourceBlockHash: `0x${string}`;
  owner: `0x${string}`;
  receiver: `0x${string}`;
  target: `0x${string}`;
  operation: 'redeem';
  sharesRaw: string;
  valueRaw: '0';
  calldata: `0x${string}`;
  planDigest: `0x${string}`;
}

export interface Observation {
  id: string;
  stage: string;
  check: string;
  result: ObservationResult;
  blockNumber?: string;
  rawValue?: string;
  reasonCode?: string;
  observedAt: string;
}

export type ProductErrorCode =
  | 'INVALID_ADDRESS'
  | 'ZERO_ADDRESS'
  | 'INVALID_AMOUNT'
  | 'PRECISION_EXCEEDED'
  | 'AMOUNT_ABOVE_LIMIT'
  | 'NO_POSITION'
  | 'UNSUPPORTED_OWNER'
  | 'UNSUPPORTED_TARGET'
  | 'SOURCE_BLOCK_CHANGED'
  | 'SOURCE_BLOCK_MISMATCH'
  | 'IDENTITY_CHANGED'
  | 'PLAN_MISMATCH'
  | 'PROVIDER_UNAVAILABLE'
  | 'MAINNET_SIGNING_DISABLED';

export class ProductError extends Error {
  readonly code: ProductErrorCode;
  readonly retryable: boolean;

  constructor(code: ProductErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'ProductError';
    this.code = code;
    this.retryable = retryable;
  }
}
