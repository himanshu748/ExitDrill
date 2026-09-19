import React from 'react';
import { formatUnits } from 'viem';
export const quantity = (raw: string | undefined, decimals = 18) =>
  raw === undefined ? 'Not observed' : formatUnits(BigInt(raw), decimals);
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
        <span>{new Date(r.createdAt).toLocaleString()}</span>
      </div>
      <div className={`outcome ${r.verdict.toLowerCase()}`}>
        <span className="eyebrow">
          {r.verdict === 'PASS' ? '✓' : r.verdict === 'BLOCKED' ? '⊘' : '?'} {r.verdict} ·{' '}
          {r.evidenceLevel.replaceAll('_', ' ')}
        </span>
        <h2>{headlines[r.verdict]}</h2>
        <p>{r.reason}</p>
      </div>
      <div className="metrics">
        <div>
          <span>Shares tested</span>
          <strong>
            {quantity(r.plan?.sharesRaw)} <small>{r.snapshot.registry.symbol}</small>
          </strong>
        </div>
        <div>
          <span>Assets received in rehearsal</span>
          <strong>
            {quantity(r.balances?.observedAssetsRaw)}{' '}
            <small>{r.snapshot.registry.assetSymbol}</small>
          </strong>
        </div>
      </div>
      <p className="fine">
        Estimated output before execution: {quantity(r.estimatedAssetsRaw)}{' '}
        {r.snapshot.registry.assetSymbol}. Original gas assessment:{' '}
        {r.gasAssessment?.toLowerCase() ?? 'unknown'}.
      </p>
      {r.adjustments.length > 0 && (
        <div className="notice">
          {r.verdict === 'PASS'
            ? 'Contract execution succeeded with simulated gas funding.'
            : 'The fork used simulated gas funding.'}{' '}
          Original wallet gas assessment: <b>{r.gasAssessment.toLowerCase()}</b>. This is not a
          ready-to-send guarantee.
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
