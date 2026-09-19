import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseShareInput, parseDecimalInteger } from '../packages/domain/src/index.ts';
import { address, buildPlan, verifyPlan } from '../packages/adapters/src/index.ts';
import { guardedSend } from '../packages/adapters/src/wallet.ts';
import { readOnlyMethod } from '../apps/worker/src/gateway.ts';
const f = JSON.parse(readFileSync('data/local/fixtures.json', 'utf8'));
const r = f.entries[0];
const b = {
  chainId: 31337,
  number: '1',
  hash: '0x' + '1'.repeat(64),
  timestamp: '',
  observedAt: '',
} as any;
describe('exact quantities and input boundaries', () => {
  it('retains precision above Number.MAX_SAFE_INTEGER', () =>
    expect(parseShareInput('9007199254740993.123456789123456789', 18)).toBe(
      9007199254740993123456789123456789n,
    ));
  it.each(['0', '-1', '1e18', '0.0000000000000000001', 'NaN'])('rejects %s', (s) =>
    expect(() => parseShareInput(s, 18)).toThrow(),
  );
  it('rejects uint256 overflow', () =>
    expect(() => parseDecimalInteger((2n ** 256n).toString(), 'amount')).toThrow());
  it.each([
    '0x0000000000000000000000000000000000000000',
    'bad',
    '0x83F20F44975D03b1b09E64809B757c47f942BEea',
  ])('rejects bad address %s', (s) => expect(() => address(s)).toThrow());
});
describe('plan and signing boundary', () => {
  const p = buildPlan(r, f.owner, '100', b);
  it('rebuilds identical calldata and digest', () => expect(verifyPlan(p, r)).toEqual(p));
  it.each(['receiver', 'target', 'calldata', 'planDigest', 'sharesRaw'])(
    'rejects tampered %s',
    (field) =>
      expect(() =>
        verifyPlan(
          {
            ...p,
            [field]:
              field === 'sharesRaw' ? '101' : '0x' + '2'.repeat(field === 'calldata' ? 8 : 40),
          },
          r,
        ),
      ).toThrow(),
  );
  it('denies mainnet before any wallet request', async () => {
    const provider = { request: vi.fn() };
    await expect(
      guardedSend(provider, { ...p, sourceChainId: 1 }, { ...r, chainId: 1 }, Date.now()),
    ).rejects.toThrow('Mainnet');
    expect(provider.request).not.toHaveBeenCalled();
  });
  it('denies stale preflight before contacting wallet', async () => {
    const provider = { request: vi.fn() };
    await expect(guardedSend(provider, p, r, Date.now() - 31000)).rejects.toThrow('expired');
    expect(provider.request).not.toHaveBeenCalled();
  });
  it.each([
    'eth_sendTransaction',
    'eth_sendRawTransaction',
    'eth_sign',
    'personal_sign',
    'anvil_setBalance',
    'anvil_impersonateAccount',
    'debug_setHead',
  ])('never forwards %s upstream', (method) => expect(readOnlyMethod(method)).toBe(false));
});
