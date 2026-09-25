import React from 'react';
import { formatUnits } from 'viem';
export const exact = (raw: string | undefined, decimals = 18) =>
  raw === undefined || raw === null ? undefined : formatUnits(BigInt(raw), decimals);
// Display only: evidence and raw JSON keep every wei.
export const quantity = (raw: string | undefined, decimals = 18) => {
  const full = exact(raw, decimals);
  if (full === undefined) return 'Not observed';
  const [whole, fraction = ''] = full.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const short = fraction.slice(0, 4).replace(/0+$/, '');
  if (!short && /[1-9]/.test(fraction) && whole === '0') return '<0.0001';
  return short ? `${grouped}.${short}` : grouped;
};
const percent = (part: bigint, whole: bigint) =>
  whole === 0n ? '0' : (Number((part * 10000n) / whole) / 100).toLocaleString();
function Amount({ raw, decimals, unit }: { raw?: string; decimals?: number; unit: string }) {
  const full = exact(raw, decimals);
  if (full === undefined) return <strong>Not observed</strong>;
  return (
    <strong title={`${full} ${unit}`}>
      {quantity(raw, decimals)} <small>{unit}</small>
    </strong>
  );
}
export function plainAnswer(r: any) {
  const reg = r.snapshot.registry;
  const tested = r.plan?.sharesRaw;
  const balance = BigInt(r.snapshot.sharesRaw ?? '0');
  const limit = BigInt(r.snapshot.maxRedeemRaw ?? '0');
  if (r.verdict === 'PASS') {
    const capped = limit < balance;
    return (
      `${quantity(tested, reg.decimals)} ${reg.symbol} became ${quantity(r.balances?.observedAssetsRaw, reg.assetDecimals)} ${reg.assetSymbol} in a private copy of the chain.` +
      (capped
        ? ` The vault only lets ${quantity(r.snapshot.maxRedeemRaw, reg.decimals)} of ${quantity(r.snapshot.sharesRaw, reg.decimals)} shares (${percent(limit, balance)}%) leave right now.`
        : '')
    );
  }
  if (r.verdict === 'BLOCKED' && limit === 0n && balance > 0n)
    return 'The vault currently allows zero shares to be redeemed. Nothing can leave until that changes.';
  if (r.verdict === 'BLOCKED' && r.evidenceLevel === 'CALL_PREFLIGHT')
    return 'The vault reported a positive preview, but the real redemption call failed. A preview alone would have missed this.';
  if (r.verdict === 'UNKNOWN')
    return 'No conclusion is drawn. A missing or failed response is never treated as a successful exit.';
  return null;
}
export const headlines: Record<string, string> = {
  PASS: 'Rehearsal succeeded.',
  BLOCKED: 'This exit was blocked in the test.',
  UNKNOWN: 'We could not verify this exit.',
  UNSUPPORTED: 'This position is not supported.',
  NO_POSITION: 'No shares found in this vault.',
};
export function DependencyStrip() {
  return (
    <div className="dependency">
      <span className="eyebrow">THE INDEPENDENT PATH</span>
      <div>
        <b>Saved kit</b>
        <i>→</i>
        <b>Wallet</b>
        <i>→</i>
        <b>RPC</b>
        <i>→</i>
        <b>Contract</b>
      </div>
      <small>
        ExitDrill hosting and the protocol website are not required by the saved kit. Wallet and RPC
        access still are.
      </small>
    </div>
  );
}
export function ReportView({ report: r }: { report: any }) {
  return (
    <>
      <div className="report-meta">
        <span className="tag">
          {r.sourceMode === 'RECORDED_REPLAY'
            ? 'RECORDED REPLAY'
            : r.environment.replaceAll('_', ' ')}
        </span>
        <time>{new Date(r.createdAt).toLocaleString()}</time>
      </div>
      <div className={`outcome ${r.verdict.toLowerCase()}`}>
        <span className="eyebrow">
          {r.verdict === 'PASS' ? '✓' : r.verdict === 'BLOCKED' ? '⊘' : '?'} {r.verdict} ·{' '}
          {r.evidenceLevel.replaceAll('_', ' ')}
        </span>
        <h2>{headlines[r.verdict]}</h2>
        {plainAnswer(r) && <p className="answer">{plainAnswer(r)}</p>}
        <p>{r.reason}</p>
      </div>
      <div className="metrics">
        <div>
          <span>Shares tested</span>
          <Amount
            raw={r.plan?.sharesRaw}
            decimals={r.snapshot.registry.decimals}
            unit={r.snapshot.registry.symbol}
          />
        </div>
        <div>
          <span>Assets received in rehearsal</span>
          <Amount
            raw={r.balances?.observedAssetsRaw}
            decimals={r.snapshot.registry.assetDecimals}
            unit={r.snapshot.registry.assetSymbol}
          />
        </div>
      </div>
      {(r.estimatedAssetsRaw ||
        (r.gasAssessment && r.gasAssessment !== 'UNKNOWN' && r.adjustments.length === 0)) && (
        <p className="fine">
          {r.estimatedAssetsRaw &&
            `Estimated output before execution: ${quantity(r.estimatedAssetsRaw, r.snapshot.registry.assetDecimals)} ${r.snapshot.registry.assetSymbol}. `}
          {r.gasAssessment &&
            r.gasAssessment !== 'UNKNOWN' &&
            r.adjustments.length === 0 &&
            `Wallet gas: ${r.gasAssessment.toLowerCase()}.`}
        </p>
      )}
      {r.adjustments.length > 0 && (
        <div className="notice">
          {r.verdict === 'PASS'
            ? 'Contract execution succeeded with simulated gas funding.'
            : 'The fork used simulated gas funding.'}{' '}
          Original wallet gas assessment: <b>{r.gasAssessment?.toLowerCase() ?? 'unknown'}</b>. This
          is not a ready-to-send guarantee.
        </div>
      )}
      <section className="ledger">
        <h3>What was checked</h3>
        {r.steps.map((s: any, i: number) => (
          <div key={i}>
            <span className="step-index">{String(i + 1).padStart(2, '0')}</span>
            <span>{s.stage}</span>
            <time>{new Date(s.at).toLocaleTimeString()}</time>
          </div>
        ))}
      </section>
      <details className="evidence">
        <summary>
          Inspect the evidence <span>Blocks, transaction, balances & assumptions ↗</span>
        </summary>
        <dl>
          <dt>Source block</dt>
          <dd>
            {r.snapshot.sourceBlock.number}
            <br />
            <code>{r.snapshot.sourceBlock.hash}</code>
          </dd>
          <dt>Owner / receiver</dt>
          <dd>
            <code>{r.snapshot.owner}</code>
          </dd>
          <dt>Vault</dt>
          <dd>
            <code>{r.snapshot.registry.target}</code>
          </dd>
          <dt>Operation</dt>
          <dd>redeem(shares, owner, owner)</dd>
          <dt>Plan digest</dt>
          <dd>
            <code>{r.plan?.planDigest ?? 'No plan created'}</code>
          </dd>
          <dt>Execution hash</dt>
          <dd>
            <code>{r.execution?.transactionHash ?? 'No transaction observed'}</code>
            <small>A private-fork hash is not a mainnet transaction.</small>
          </dd>
        </dl>
        <h4>Raw evidence</h4>
        <pre tabIndex={0}>{JSON.stringify(r, null, 2)}</pre>
      </details>
      <p className="fine">
        Historical evidence cannot guarantee a future exit. A rehearsal using a public address does
        not prove that you control its wallet.
      </p>
    </>
  );
}
