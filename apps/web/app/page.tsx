'use client';
import React, { useEffect, useState, useRef } from 'react';
import { formatUnits } from 'viem';
import { parseShareInput, resolveShareShortcut } from '../../../packages/domain/src/index.ts';
import { ReportView, DependencyStrip, quantity } from '../../../packages/ui/src/Report.tsx';
async function api(path: string, body?: any, method?: string, headers?: any) {
  const r = await fetch(path, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: { 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.message ?? 'Request unavailable');
  return data;
}
export default function Home() {
  const [view, setView] = useState('home'),
    [registry, setRegistry] = useState<any>(null),
    [owner, setOwner] = useState(''),
    [vault, setVault] = useState('fixture-0'),
    [snapshot, setSnapshot] = useState<any>(null),
    [amount, setAmount] = useState(''),
    [report, setReport] = useState<any>(null),
    [job, setJob] = useState<any>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [exportOpen, setExportOpen] = useState(false),
    [saved, setSaved] = useState(false);
  const modalRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!exportOpen) return;
    const previous = document.activeElement as HTMLElement;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false);
      if (e.key === 'Tab') {
        const nodes =
          modalRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [exportOpen]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (location.pathname === '/inspect') setView('inspect');
    const match = location.pathname.match(/^\/drills\/([a-f0-9-]+)$/);
    if (match) {
      setView('drill');
      setBusy(true);
      poll(match[1]);
    }
    api('/v1/registry')
      .then((r) => {
        setRegistry(r);
        setVault(r.candidate?.enabled ? 'sdai-mainnet' : 'fixture-0');
      })
      .catch(() => setError('The service is temporarily unavailable. Reload this page to retry.'));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const change = () => {
    setSnapshot(null);
    setReport(null);
    setSaved(false);
    setJob(null);
    setError('');
  };
  async function inspect() {
    setBusy(true);
    setError('');
    setReport(null);
    try {
      await api('/v1/session', {});
      const s = await api('/v1/inspections', { owner, vaultId: vault });
      setSnapshot(s);
      setAmount(
        formatUnits(
          BigInt(s.maxRedeemRaw) < BigInt(s.sharesRaw)
            ? BigInt(s.maxRedeemRaw)
            : BigInt(s.sharesRaw),
          s.registry.decimals,
        ),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function drill() {
    setBusy(true);
    setError('');
    try {
      const raw = parseShareInput(amount, snapshot.registry.decimals);
      if (raw > BigInt(snapshot.sharesRaw) || raw > BigInt(snapshot.maxRedeemRaw))
        throw Error('Choose shares within the observed redemption limit.');
      const j = await api(
        '/v1/drills',
        { inspectionId: snapshot.id, sharesRaw: String(raw) },
        'POST',
        { 'idempotency-key': crypto.randomUUID() },
      );
      setJob(j);
      setView('drill');
      history.pushState(null, '', '/drills/' + j.id);
      poll(j.id);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function poll(id: string) {
    try {
      const j = await api('/v1/drills/' + id);
      setJob(j);
      if (j.receipt) {
        setReport(j.receipt);
        setBusy(false);
        return;
      }
      timer.current = setTimeout(() => poll(id), 1000);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function replay() {
    setBusy(true);
    setError('');
    try {
      setReport(await api('/v1/replay'));
      setView('drill');
      setJob(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveKit() {
    setBusy(true);
    try {
      const res = await fetch('/v1/drills/' + report.id + '/kit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) throw Error('Kit packaging failed. Your completed rehearsal is unchanged.');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exitdrill-kit.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setSaved(true);
      setExportOpen(false);
    } catch (e: any) {
      setExportOpen(false);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="header">
        <button
          className="wordmark"
          onClick={() => {
            setView('home');
            history.pushState(null, '', '/');
            setError('');
          }}
          aria-label="ExitDrill home"
        >
          <span className="logo">↗</span>ExitDrill<span className="edition">FIELD MANUAL / 01</span>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={view === 'inspect' ? 'active' : ''}
            onClick={() => {
              setView('inspect');
              history.pushState(null, '', '/inspect');
            }}
          >
            Inspector
          </button>
          <button onClick={replay}>Recorded demo</button>
          <span className="header-note">
            <i />{' '}
            {!registry
              ? 'CHECKING COVERAGE'
              : registry.candidate?.enabled
                ? 'ETHEREUM · READ-ONLY'
                : 'TEST VAULTS · LIVE DEMO'}
          </span>
        </nav>
      </header>
      <main id="main">
        {view === 'home' ? (
          <>
            <section className="hero">
              <div className="eyebrow">
                <span className="tiny-cross">+</span> WITHDRAWAL REHEARSAL & RECOVERY
              </div>
              <h1>
                Test your way out
                <br />
                before you <em>need it.</em>
              </h1>
              <div className="hero-bottom">
                <div>
                  <p className="lede">
                    Rehearse a supported vault withdrawal.
                    <br />
                    Keep the tools to check your exit, even when
                    <br className="desktop" /> the usual website is gone.
                  </p>
                  <div className="actions">
                    <button
                      className="primary"
                      onClick={() => {
                        change();
                        setSaved(false);
                        if (!registry?.candidate?.enabled) {
                          setOwner(registry?.owner ?? '');
                          setVault('fixture-0');
                        }
                        setView('inspect');
                        history.pushState(null, '', '/inspect');
                      }}
                    >
                      {!registry
                        ? 'Inspect a position'
                        : registry.candidate?.enabled
                          ? 'Inspect a position'
                          : 'Try with test funds'}{' '}
                      <span>↗</span>
                    </button>
                    <button className="text-button" onClick={replay}>
                      Open a recorded demo <span>→</span>
                    </button>
                  </div>
                  <p className="fine">
                    {!registry
                      ? 'Loading current vault coverage. No wallet connection is required to inspect.'
                      : registry.candidate?.enabled
                        ? 'Savings DAI on Ethereum: inspect and rehearse without signing. Mainnet broadcasting is disabled.'
                        : 'Live demo uses disposable test funds. The recorded Ethereum example is historical evidence.'}
                  </p>
                </div>
                <div className="field-note">
                  <span className="eyebrow">PREPARATION, NOT A PROMISE</span>
                  <span className="note-number">01—04</span>
                  <p>
                    A clear plan.
                    <br />
                    An actual rehearsal.
                    <br />
                    Evidence you can keep.
                  </p>
                  <span className="note-bottom">KNOW WHAT WAS TESTED. KNOW WHAT WASN’T.</span>
                </div>
              </div>
            </section>
            <div className="journey">
              {[
                ['01', 'Inspect', 'Read a supported vault at a pinned block.'],
                ['02', 'Rehearse', 'Execute your exact exit in an isolated fork.'],
                ['03', 'Understand', 'See the result, evidence, and limitations.'],
                ['04', 'Keep', 'Save a kit that works without our hosting.'],
              ].map(([n, t, d]) => (
                <article key={n}>
                  <span className="eyebrow">{n} /</span>
                  <h2>{t}</h2>
                  <p>{d}</p>
                </article>
              ))}
            </div>
            <DependencyStrip />
            <section className="scope">
              <div>
                <span className="eyebrow">CURRENT COVERAGE</span>
                <h2>One exit. Carefully checked.</h2>
              </div>
              <div>
                <p>
                  <b>Local ERC-4626 fixtures</b> are available for live rehearsal: normal,
                  restricted, capped, and reverting.
                </p>
                <p>
                  {!registry
                    ? 'Checking current Ethereum rehearsal availability…'
                    : registry.candidate?.enabled
                      ? 'Savings DAI on Ethereum is enabled for read-only inspection and private-fork rehearsal. Mainnet broadcasting remains disabled.'
                      : 'Savings DAI on Ethereum is a candidate integration. Its validation gates are not yet complete.'}
                </p>
                <p className="fine">
                  No lost-key recovery. No bypass of contract restrictions. No guarantee of a future
                  withdrawal.
                </p>
              </div>
            </section>
          </>
        ) : (
          <section className="workspace">
            <div className="workspace-heading">
              <div>
                <span className="eyebrow">
                  {view === 'inspect' ? '01 / INSPECT A POSITION' : '02—03 / EXIT REHEARSAL'}
                </span>
                <h1>
                  {view === 'inspect' ? 'Start with what’s on-chain.' : 'Your exit, examined.'}
                </h1>
              </div>
              <span className="tag">
                {(
                  (view === 'drill' ? report?.environment : undefined) ??
                  registry?.entries?.find((r: any) => r.id === vault)?.environment ??
                  'LOCAL_FIXTURE'
                ).replaceAll('_', ' ')}
              </span>
            </div>
            <div className="work-grid">
              <div>
                {view === 'inspect' ? (
                  <section className="panel">
                    <div className="section-top">
                      <h2>Position inspector</h2>
                      <span className="eyebrow">READ-ONLY</span>
                    </div>
                    <p className="muted">No wallet connection or signature required.</p>
                    <label htmlFor="owner">Public wallet address</label>
                    <input
                      id="owner"
                      spellCheck={false}
                      value={owner}
                      placeholder="0x…"
                      onChange={(e) => {
                        setOwner(e.target.value);
                        change();
                      }}
                    />
                    <button
                      className="small-link"
                      onClick={() => {
                        setOwner(registry?.owner ?? '');
                        setVault('fixture-0');
                        change();
                      }}
                    >
                      Use test funds ↗
                    </button>
                    {registry?.candidate?.enabled && registry?.exampleOwner && (
                      <>
                        <button
                          className="small-link"
                          onClick={() => {
                            change();
                            setOwner(registry.exampleOwner);
                            setVault('sdai-mainnet');
                          }}
                        >
                          Try a public sDAI position ↗
                        </button>
                        <p className="fine">
                          The example is a public Ethereum address. It is not your wallet; no
                          ownership or signature is required to rehearse it.
                        </p>
                      </>
                    )}
                    <label htmlFor="vault">Supported vault</label>
                    <select
                      id="vault"
                      value={vault}
                      onChange={(e) => {
                        setVault(e.target.value);
                        change();
                      }}
                    >
                      {registry?.entries?.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.label} · {r.chainId === 1 ? 'Ethereum' : 'Local fixture'}
                        </option>
                      ))}
                    </select>
                    <p className="fine">
                      Submitting an address reveals this lookup to the ExitDrill server and its
                      configured RPC. Only the selected vault is checked.
                    </p>
                    <button
                      className="primary full"
                      disabled={busy || !registry?.entries?.length}
                      onClick={inspect}
                    >
                      {busy ? 'Reading the pinned snapshot…' : 'Inspect position'} <span>→</span>
                    </button>
                    {snapshot && (
                      <div className="snapshot">
                        <span className="eyebrow">
                          ✓ IDENTITY MATCHED · BLOCK {snapshot.sourceBlock.number}
                        </span>
                        <div className="metrics">
                          <div>
                            <span>Share balance</span>
                            <strong>
                              {quantity(snapshot.sharesRaw)}{' '}
                              <small>{snapshot.registry.symbol}</small>
                            </strong>
                          </div>
                          <div>
                            <span>Redeemable now</span>
                            <strong>
                              {quantity(snapshot.maxRedeemRaw)}{' '}
                              <small>{snapshot.registry.symbol}</small>
                            </strong>
                          </div>
                        </div>
                        {snapshot.ownerCode ? (
                          <p className="notice">
                            This owner has account code. Execution rehearsal is unsupported in v0.
                          </p>
                        ) : BigInt(snapshot.sharesRaw) === 0n ? (
                          <p className="notice">No shares found in this supported vault.</p>
                        ) : BigInt(snapshot.maxRedeemRaw) === 0n ? (
                          <>
                            <p className="notice">
                              The vault reports no shares redeemable now. This is an observed
                              restriction, not a connectivity error.
                            </p>
                            <button
                              className="secondary"
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  const j = await api(
                                    '/v1/drills',
                                    { inspectionId: snapshot.id, sharesRaw: snapshot.sharesRaw },
                                    'POST',
                                    { 'idempotency-key': crypto.randomUUID() },
                                  );
                                  setJob(j);
                                  setView('drill');
                                  history.pushState(null, '', '/drills/' + j.id);
                                  poll(j.id);
                                } catch (e: any) {
                                  setError(e.message);
                                  setBusy(false);
                                }
                              }}
                            >
                              Record this blocked exit →
                            </button>
                          </>
                        ) : (
                          <>
                            <label htmlFor="amount">
                              Shares to redeem{' '}
                              <span className="muted">{snapshot.registry.symbol}</span>
                            </label>
                            <input
                              id="amount"
                              inputMode="decimal"
                              value={amount}
                              onChange={(e) => {
                                setAmount(e.target.value);
                                setReport(null);
                              }}
                            />
                            <div className="shortcuts">
                              {(['25', '50', 'max'] as const).map((n) => (
                                <button
                                  key={n}
                                  onClick={() => {
                                    try {
                                      const limit =
                                        BigInt(snapshot.maxRedeemRaw) < BigInt(snapshot.sharesRaw)
                                          ? BigInt(snapshot.maxRedeemRaw)
                                          : BigInt(snapshot.sharesRaw);
                                      setAmount(
                                        formatUnits(
                                          resolveShareShortcut(n, limit),
                                          snapshot.registry.decimals,
                                        ),
                                      );
                                    } catch (e: any) {
                                      setError(e.message);
                                    }
                                  }}
                                >
                                  {n === 'max' ? 'Maximum' : n + '%'}
                                </button>
                              ))}
                            </div>
                            <p className="fine">
                              Exact output is observed during execution. The balance-wide preview is{' '}
                              {quantity(snapshot.assetsRaw)} {snapshot.registry.assetSymbol}.
                            </p>
                            <button className="primary full" disabled={busy} onClick={drill}>
                              Run exit rehearsal <span>↗</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </section>
                ) : (
                  <section className="panel">
                    {report ? (
                      <>
                        <ReportView report={report} />
                        {report.sourceMode !== 'RECORDED_REPLAY' && (
                          <button
                            className="primary full"
                            onClick={() => setExportOpen(true)}
                            disabled={busy}
                          >
                            Export recovery kit <span>↓</span>
                          </button>
                        )}
                        {saved && (
                          <p role="status">
                            Kit downloaded. Extract the ZIP and open START_HERE.html in your
                            browser. Save it outside this website so you can find it during an
                            outage.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="eyebrow">PRIVATE FORK · NO MAINNET TRANSACTION</span>
                        <h2>Testing the exact exit.</h2>
                        <p>Each step below comes from the worker’s persisted events.</p>
                        <div className="ledger" aria-live="polite">
                          {job?.events?.map((s: any, i: number) => (
                            <div key={i}>
                              <span className="step-index">{i + 1}</span>
                              {s.stage}
                            </div>
                          ))}
                        </div>
                        <p role="status">{job?.status ?? 'Preparing request…'}</p>
                        {!busy && job?.id && (
                          <button
                            className="secondary"
                            onClick={() => {
                              setBusy(true);
                              poll(job.id);
                            }}
                          >
                            Reconnect to this drill
                          </button>
                        )}
                      </>
                    )}
                  </section>
                )}
              </div>
              <aside>
                <div className="aside-rule">
                  <span className="eyebrow">THE TEST BOUNDARY</span>
                  <h3>
                    Evidence, without
                    <br />
                    the guesswork.
                  </h3>
                  <p>
                    We redeem vault shares for underlying assets, sent to the same address that owns
                    the shares.
                  </p>
                  <ul>
                    <li>No approvals or recovery wallets</li>
                    <li>No seed phrases or private keys</li>
                    <li>No mainnet broadcasting</li>
                  </ul>
                  <hr />
                  <span className="eyebrow">A RESULT HAS A CONTEXT</span>
                  <p>
                    A rehearsal describes a past test. Contract state, network conditions, and gas
                    costs can change.
                  </p>
                  {view === 'drill' && report && (
                    <>
                      <hr />
                      <span className="eyebrow">EVIDENCE RECEIPT</span>
                      <code>{report.id}</code>
                      <p className="fine">
                        {report.snapshot.registry.label}
                        <br />
                        {report.evidenceLevel.replaceAll('_', ' ')}
                      </p>
                    </>
                  )}
                </div>
              </aside>
            </div>
          </section>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError('')}>
              ×
            </button>
          </div>
        )}
      </main>
      <footer>
        <span className="wordmark">↗ ExitDrill</span>
        <span>Prepare deliberately. Verify independently.</span>
        <span>v0.1 / TEST RELEASE</span>
      </footer>
      {exportOpen && (
        <div className="modal-backdrop">
          <section
            ref={modalRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
          >
            <span className="eyebrow">04 / KEEP YOUR TOOLS</span>
            <h2 id="export-title">Save your recovery kit.</h2>
            <p>
              Includes this public address, exit plan, historical evidence, prebuilt local
              interface, launcher, and checksums. The record reveals an exit intention.
            </p>
            <p>Excludes private keys, RPC credentials, server secrets, and session cookies.</p>
            <div className="notice">
              Open START_HERE.html to read saved evidence offline in any browser. Fresh checks use
              the included launcher and require Node.js 22+ and an RPC connection. Test withdrawals
              also need a compatible wallet.
            </div>
            <p className="fine">
              Checksums detect changed files. They do not authenticate the publisher.
            </p>
            <div className="actions">
              <button className="primary" autoFocus disabled={busy} onClick={saveKit}>
                Save recovery kit ↓
              </button>
              <button className="secondary" onClick={() => setExportOpen(false)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
