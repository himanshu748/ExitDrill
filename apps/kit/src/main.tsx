import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createPublicClient, http } from 'viem';
import { inspect } from '../../../packages/chain/src/index.ts';
import {
  abi,
  buildPlan,
  verifyPlan,
  registryDigest,
} from '../../../packages/adapters/src/index.ts';
import { guardedSend } from '../../../packages/adapters/src/wallet.ts';
import { ReportView, DependencyStrip, quantity } from '../../../packages/ui/src/Report.tsx';
import '../../web/app/globals.css';
import { verifyWithdrawal } from '../../../packages/chain/src/verify-withdrawal.ts';
import { pinnedRegistry } from './pinned-registry.ts';
function Kit() {
  const walletEpoch = useRef(0);
  const [boot, setBoot] = useState<any>(null),
    [report, setReport] = useState<any>(null),
    [rpc, setRpc] = useState(''),
    [status, setStatus] = useState(''),
    [providers, setProviders] = useState<any[]>([]),
    [provider, setProvider] = useState<any>(null),
    [fresh, setFresh] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [submission, setSubmission] = useState<any>(null);
  useEffect(() => {
    Promise.all([
      fetch('/bootstrap').then((r) => r.json()),
      fetch('/data/receipt.json').then((r) => r.json()),
    ])
      .then(([b, r]) => {
        setBoot(b);
        setReport(r);
      })
      .catch(() => setStatus('Saved evidence could not be loaded.'));
    const listen = (e: any) =>
      setProviders((p) =>
        p.some((x) => x.info.uuid === e.detail.info.uuid) ? p : [...p, e.detail],
      );
    window.addEventListener('eip6963:announceProvider', listen);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    return () => window.removeEventListener('eip6963:announceProvider', listen);
  }, []);
  useEffect(() => {
    if (!provider) return;
    const changed = () => {
      walletEpoch.current++;
      setFresh(null);
      setStatus('Wallet changed. A new preflight is required.');
    };
    provider.on?.('accountsChanged', changed);
    provider.on?.('chainChanged', changed);
    return () => {
      provider.removeListener?.('accountsChanged', changed);
      provider.removeListener?.('chainChanged', changed);
    };
  }, [provider]);
  const post = async (path: string, data: any) => {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-exitdrill-token': boot.token },
      body: JSON.stringify(data),
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error);
    return result;
  };
  const c = () =>
    createPublicClient({
      transport: http('/rpc', {
        fetchOptions: { headers: { 'x-exitdrill-token': boot.token } },
        retryCount: 0,
        timeout: 15000,
      }),
    });
  async function configure() {
    setBusy(true);
    setFresh(null);
    try {
      await post('/configure', { url: rpc });
      setRpc('');
      setStatus('RPC configured in launcher memory. Run a current preflight.');
    } catch (e: any) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function recheck() {
    setBusy(true);
    setFresh(null);
    try {
      if (!boot.integrity.matches)
        throw Error('Kit checksum mismatch. Restore a trusted copy before continuing.');
      if (!report.plan) throw Error('This diagnostic record has no executable plan.');
      const trusted = pinnedRegistry.find((r) => r.id === report.snapshot.registry.id);
      if (!trusted || registryDigest(trusted as any) !== registryDigest(report.snapshot.registry))
        throw Error('Saved registry does not match this application release.');
      verifyPlan(report.plan, report.snapshot.registry);
      const s = await inspect(c(), report.snapshot.registry, report.snapshot.owner);
      if (s.ownerCode) throw Error('Owners with account code are unsupported.');
      if (
        BigInt(report.plan.sharesRaw) > BigInt(s.maxRedeemRaw) ||
        BigInt(report.plan.sharesRaw) > BigInt(s.sharesRaw)
      )
        throw Error('Requested shares exceed the current redemption limit.');
      const plan = buildPlan(s.registry, s.owner, report.plan.sharesRaw, s.sourceBlock);
      await c().call({
        account: plan.owner,
        to: plan.target,
        data: plan.calldata,
        value: 0n,
        blockNumber: BigInt(s.sourceBlock.number),
      });
      setFresh({ plan, snapshot: s, at: Date.now() });
      setStatus(
        'Current call preflight succeeded. This read-only check is not a full fork rehearsal.',
      );
    } catch (e: any) {
      setStatus('Current state not verified: ' + (e.shortMessage ?? e.message));
    } finally {
      setBusy(false);
    }
  }
  async function connect(p: any) {
    try {
      await p.provider.request({ method: 'eth_requestAccounts' });
      setProvider(p.provider);
      setFresh(null);
      setStatus('Wallet selected. Run a fresh preflight before review.');
    } catch {
      setStatus('Wallet connection was not completed.');
    }
  }
  async function send() {
    setBusy(true);
    const initialEpoch = walletEpoch.current;
    let submissionAttempted = false;
    let knownSubmission: any = null;
    try {
      if (submission)
        throw Error('A submission already exists. Reconcile it before any new transaction.');
      if (!fresh || !provider) throw Error('Select a wallet and recheck first.');
      const s = await inspect(c(), report.snapshot.registry, report.snapshot.owner);
      if (s.ownerCode || BigInt(fresh.plan.sharesRaw) > BigInt(s.maxRedeemRaw))
        throw Error('Current position no longer matches review.');
      await c().call({
        account: fresh.plan.owner,
        to: fresh.plan.target,
        data: fresh.plan.calldata,
        value: 0n,
      });
      const epoch = walletEpoch.current;
      const before = {
        shares: s.sharesRaw,
        assets: String(
          await c().readContract({
            address: s.registry.asset,
            abi,
            functionName: 'balanceOf',
            args: [s.owner],
            blockNumber: BigInt(s.sourceBlock.number),
          }),
        ),
        supply: String(
          await c().readContract({
            address: s.registry.target,
            abi,
            functionName: 'totalSupply',
            blockNumber: BigInt(s.sourceBlock.number),
          }),
        ),
      };
      if (epoch !== walletEpoch.current) throw Error('Wallet changed. Recheck the plan.');
      const hash = await guardedSend(
        provider,
        fresh.plan,
        report.snapshot.registry,
        fresh.at,
        () => {
          if (initialEpoch !== walletEpoch.current)
            throw Error('Wallet changed. Recheck the plan.');
          const pending = {
            status: 'AWAITING_WALLET',
            plan: fresh.plan,
            before,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem('exitdrill-submission-' + report.id, JSON.stringify(pending));
          setSubmission(pending);
          submissionAttempted = true;
        },
      );
      const sub = { hash, status: 'SUBMITTED', owner: fresh.plan.owner, before, plan: fresh.plan };
      knownSubmission = sub;
      setSubmission(sub);
      localStorage.setItem('exitdrill-submission-' + report.id, JSON.stringify(sub));
      setStatus('Test transaction submitted. Check inclusion; do not resend.');
      setFresh(null);
    } catch (e: any) {
      if (knownSubmission) {
        setSubmission(knownSubmission);
        setStatus(
          'Transaction submitted, but local persistence failed. Save this transaction hash before closing the page.',
        );
      } else if (e.code === 4001) {
        setSubmission(null);
        localStorage.removeItem('exitdrill-submission-' + report.id);
        setStatus('Wallet request rejected. No contract failure is inferred.');
      } else if (!submissionAttempted) {
        setStatus(e.shortMessage ?? e.message);
        setFresh(null);
      } else if (/disabled|allowlist|expired|changed|recheck|matches|submission/i.test(e.message)) {
        setStatus(e.message);
        setFresh(null);
      } else {
        const sub = { status: 'OUTCOME_UNKNOWN' };
        setSubmission(sub);
        localStorage.setItem('exitdrill-submission-' + report.id, JSON.stringify(sub));
        setStatus(
          'Submission outcome unknown. Inspect wallet activity. Do not resend automatically.',
        );
      }
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (report) {
      try {
        const prior = localStorage.getItem('exitdrill-submission-' + report.id);
        if (prior) setSubmission(JSON.parse(prior));
      } catch {}
    }
  }, [report]);
  async function reconcile() {
    if (!submission?.hash) {
      setStatus(
        'No transaction hash is available. Inspect wallet activity before taking further action.',
      );
      return;
    }
    try {
      const result = await verifyWithdrawal(
        c(),
        submission.hash,
        submission.plan,
        report.snapshot.registry,
        submission.before,
      );
      setStatus(result.message);
      const next = { ...submission, ...result };
      setSubmission(next);
      localStorage.setItem('exitdrill-submission-' + report.id, JSON.stringify(next));
    } catch {
      setStatus('Receipt is unavailable. Keep the submission unresolved; do not resend.');
    }
  }
  if (!report || !boot)
    return (
      <main className="kit-main">
        <h1>Opening saved evidence…</h1>
        <p>{status}</p>
      </main>
    );
  return (
    <main className="kit-main" id="main">
      <header className="kit-header">
        <span className="wordmark">
          ↗ ExitDrill <span className="edition">LOCAL KIT / 0.1</span>
        </span>
        <span className="tag">{report.environment.replaceAll('_', ' ')}</span>
      </header>
      <section className="workspace">
        <span className="eyebrow">YOUR SAVED WAY OUT</span>
        <h1>Independent of our website.</h1>
        <p>Hosted services are not required. A wallet and RPC connection still are.</p>
        <div className="notice">
          Mainnet broadcasting is disabled in this release. Saved evidence is historical.
        </div>
        <section className="kit-section">
          <h2>01 / Verify your kit</h2>
          <p>
            {boot.integrity.matches
              ? '✓ Files match this checksum list.'
              : '⚠ File integrity mismatch. Restore a trusted copy.'}
          </p>
          <p className="fine">
            Publisher provenance is not verified. A matching checksum list alone cannot authenticate
            an untrusted archive.
          </p>
        </section>
        <div className="kit-grid">
          <section className="panel">
            <h2>02 / Configure connection</h2>
            <label htmlFor="rpc">RPC endpoint</label>
            <input
              id="rpc"
              type="password"
              value={rpc}
              onChange={(e) => setRpc(e.target.value)}
              placeholder={boot.localMode ? 'http://127.0.0.1:8545' : 'https://your-rpc-provider'}
            />
            <p className="fine">
              Endpoint credentials stay in launcher memory and are never added to saved evidence.
            </p>
            <button className="secondary full" disabled={busy || !rpc} onClick={configure}>
              Configure RPC
            </button>
          </section>
          <section className="panel">
            <h2>03 / Recheck position</h2>
            <p className="muted">
              Reconstruct the plan, match contract identity, and test the exact call against a fresh
              source block.
            </p>
            <button
              className="primary full"
              disabled={busy || !boot.integrity.matches}
              onClick={recheck}
            >
              Run current preflight →
            </button>
          </section>
        </div>
        <p className="kit-status" role="status">
          {busy ? 'Checking…' : status}
        </p>
        {report.snapshot.registry.signing && (
          <section className="panel kit-section">
            <h2>04 / Review test withdrawal</h2>
            <p>
              Only this allowlisted local deployment can request a wallet transaction. Select your
              injected wallet explicitly.
            </p>
            {providers.length ? (
              providers.map((p) => (
                <button className="secondary" key={p.info.uuid} onClick={() => connect(p)}>
                  {p.info.name}
                </button>
              ))
            ) : (
              <p className="notice">
                No EIP-6963 wallet detected. Open this kit in a browser with a compatible wallet to
                continue.
              </p>
            )}
            {fresh && (
              <dl>
                <dt>Full owner and receiver</dt>
                <dd>
                  <code>{fresh.plan.owner}</code>
                </dd>
                <dt>Target · local chain 31337</dt>
                <dd>
                  <code>{fresh.plan.target}</code>
                </dd>
                <dt>Shares to redeem</dt>
                <dd>{quantity(fresh.plan.sharesRaw)} tSHARE</dd>
                <dt>Method</dt>
                <dd>redeem · selector {fresh.plan.calldata.slice(0, 10)}</dd>
              </dl>
            )}
            <button
              className="primary full"
              disabled={busy || !fresh || !provider || !!submission}
              onClick={send}
            >
              Confirm test withdrawal in wallet ↗
            </button>
            {submission && (
              <div className="notice">
                <b>{submission.status}</b>
                <p>
                  <code>{submission.hash ?? 'Hash unavailable — inspect wallet activity.'}</code>
                </p>
                <button className="secondary" onClick={reconcile}>
                  Check transaction status
                </button>
              </div>
            )}
          </section>
        )}
        <details className="panel kit-section">
          <summary>Saved evidence · {new Date(report.createdAt).toLocaleString()}</summary>
          <ReportView report={report} />
        </details>
        <DependencyStrip />
      </section>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Kit />);
