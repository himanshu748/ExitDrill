import { ProductError } from './types.ts';

const UINT256_MAX = (1n << 256n) - 1n;

export function parseDecimalInteger(value: string, field: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new ProductError(
      'INVALID_AMOUNT',
      `${field} must be a base-10 integer string with no leading zeros.`,
    );
  }
  const parsed = BigInt(value);
  if (parsed > UINT256_MAX) {
    throw new ProductError('INVALID_AMOUNT', `${field} exceeds uint256.`);
  }
  return parsed;
}

export function decimalString(value: bigint): string {
  if (value < 0n) {
    throw new ProductError('INVALID_AMOUNT', 'Negative quantities are invalid.');
  }
  return value.toString(10);
}

export function parseShareInput(input: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255 || input.length > 400)
    throw new ProductError('INVALID_AMOUNT', 'Invalid token precision or amount length.');
  const trimmed = input.trim();
  if (trimmed === '' || trimmed.startsWith('-')) {
    throw new ProductError('INVALID_AMOUNT', 'Share amount must be a positive decimal.');
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new ProductError('INVALID_AMOUNT', 'Share amount contains invalid characters.');
  }

  const [wholeRaw, fractionRaw = ''] = trimmed.split('.');
  if (fractionRaw.length > decimals) {
    throw new ProductError(
      'PRECISION_EXCEEDED',
      `Share amount uses more than ${decimals} decimal places.`,
    );
  }
  if (wholeRaw === undefined) {
    throw new ProductError('INVALID_AMOUNT', 'Share amount is malformed.');
  }

  const whole = wholeRaw === '' ? 0n : BigInt(wholeRaw);
  const fractionPadded = fractionRaw.padEnd(decimals, '0');
  const fraction = fractionPadded === '' ? 0n : BigInt(fractionPadded);
  const scale = 10n ** BigInt(decimals);
  const raw = whole * scale + fraction;
  if (raw <= 0n) {
    throw new ProductError('INVALID_AMOUNT', 'Share amount must be greater than zero.');
  }
  if (raw > UINT256_MAX) {
    throw new ProductError('INVALID_AMOUNT', 'Share amount exceeds uint256.');
  }
  return raw;
}

export function resolveShareShortcut(shortcut: '25' | '50' | 'max', balanceRaw: bigint): bigint {
  if (balanceRaw <= 0n) {
    throw new ProductError('NO_POSITION', 'No shares found in this vault.');
  }
  if (shortcut === 'max') {
    return balanceRaw;
  }
  const numerator = shortcut === '25' ? 25n : 50n;
  const amount = (balanceRaw * numerator) / 100n;
  if (amount <= 0n) {
    throw new ProductError(
      'INVALID_AMOUNT',
      'The selected percentage rounds to zero shares at this balance.',
    );
  }
  return amount;
}

export function assertRedeemableAmount(
  sharesRaw: bigint,
  balanceRaw: bigint,
  maxRedeemRaw: bigint,
): void {
  if (sharesRaw <= 0n) {
    throw new ProductError('INVALID_AMOUNT', 'Shares to redeem must be positive.');
  }
  const limit = balanceRaw < maxRedeemRaw ? balanceRaw : maxRedeemRaw;
  if (sharesRaw > limit) {
    throw new ProductError(
      'AMOUNT_ABOVE_LIMIT',
      `Requested shares exceed the observed maximum of ${decimalString(limit)}.`,
    );
  }
}
