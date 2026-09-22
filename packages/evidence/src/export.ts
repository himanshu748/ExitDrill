import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';
import type { Report } from '../../../apps/worker/src/rehearse.ts';
export async function exportKit(report: Report) {
  const files: Record<string, Uint8Array> = {};
  const add = (path: string, data: string | Uint8Array) => {
    files[path] = typeof data === 'string' ? strToU8(data) : data;
  };
  function walk(dir: string, prefix: string) {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      if (f.isDirectory()) walk(join(dir, f.name), prefix + '/' + f.name);
      else add(prefix + '/' + f.name, readFileSync(join(dir, f.name)));
    }
  }
  walk('apps/kit/dist', 'public');
  add('start.mjs', readFileSync('apps/kit/start.mjs'));
  add('data/registry.json', JSON.stringify(report.snapshot.registry, null, 2));
  add('data/plan.json', JSON.stringify(report.plan, null, 2));
  add('data/receipt.json', JSON.stringify(report, null, 2));
  add(
    'data/manifest.json',
    JSON.stringify(
      {
        version: '0.1.0',
        reportId: report.id,
        createdAt: report.createdAt,
        mainnetBroadcast: false,
        prerequisites: [
          'Node.js 22+',
          'Browser',
          'RPC connection for fresh reads',
          'Compatible injected wallet for test signing',
        ],
      },
      null,
      2,
    ),
  );
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
  const local = report.environment === 'LOCAL_FIXTURE';
  const launch = `node start.mjs${local ? ' --local-fixture' : ''}`;
  add(
    'START_HERE.html',
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your ExitDrill recovery kit</title>
<style>body{font:18px/1.6 system-ui,sans-serif;color:#19342a;background:#f7f8f4;max-width:760px;margin:48px auto;padding:0 24px}h1{font-size:42px;line-height:1.1}h2{font-size:24px;margin-top:36px}a{color:#235b43}code{background:#e4ebe4;padding:4px 8px;overflow-wrap:anywhere}aside{border-left:4px solid #54745f;padding:12px 20px;background:#edf1eb}.small{font-size:15px}</style>
<p>EXITDRILL / SAVED KIT</p><h1>Your exit tools, kept locally.</h1>
<p>${escape(report.snapshot.registry.label)} · ${escape(report.environment)}<br>Saved ${escape(report.createdAt)}</p>
<aside><strong>${escape(report.verdict)}</strong><p>${escape(report.reason)}</p><p>This result describes a past rehearsal. It does not guarantee that a withdrawal will succeed now.</p></aside>
<h2>1. Read your saved evidence</h2><p><a href="data/report.html">Open the saved report</a>. This works without internet, Node.js, or ExitDrill hosting.</p>
<h2>2. Check the exit again</h2><ol><li>Keep all files together in the extracted folder.</li><li>Install Node.js 22 or newer from <a href="https://nodejs.org/">nodejs.org</a> if needed.</li><li>Open a terminal in this folder and run <code>${launch}</code>.</li><li>Open <a href="http://127.0.0.1:4173">http://127.0.0.1:4173</a>, configure your RPC, and select the current preflight check.</li></ol>
<p>${local ? 'This report uses disposable test funds. Fresh checks need the original local test chain at 127.0.0.1:8545. The hosted demo chain is private and can reset; its downloaded kit preserves evidence but cannot reconnect to that hosted chain.' : 'Use an Ethereum HTTPS RPC endpoint. The launcher keeps it in memory. Fresh checks still need internet access to that provider.'}</p>
<h2>3. Understand what you can do</h2><p>Mainnet broadcasting is disabled. Wallet signing is limited to allowlisted local test deployments. The kit cannot recover keys or bypass a vault restriction.</p>
<h2>If something fails</h2><p>If the command is not found, check that Node.js is installed. If port 4173 is busy, stop the other kit first. If the RPC is unavailable, try again with a working provider. An unavailable check is not a successful exit.</p>
<p class="small">This kit associates ${escape(report.snapshot.owner)} with an exit intention. Keep it private. Checksums detect changed files; they do not establish that the publisher is trustworthy. Only run a kit from a source you trust.</p></html>`,
  );
  add(
    'data/report.html',
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ExitDrill saved evidence</title><h1>${escape(report.verdict)} · ${escape(report.environment)}</h1><p>${escape(report.reason)}</p><p>Historical evidence: ${escape(report.createdAt)}. Not a guarantee of future execution.</p><pre>${escape(JSON.stringify(report, null, 2))}</pre></html>`,
  );
  add(
    'START_HERE.md',
    `# ExitDrill local kit\n\nOpen START_HERE.html in your browser for instructions and offline evidence.\n\nFresh checks require Node.js 22+ and a browser; no npm install is needed.\n\nRun: ${launch}\nOpen http://127.0.0.1:4173\n\n${local ? 'Fresh fixture checks require your original local chain. The hosted demo RPC is private and cannot be used by this kit.' : 'Configure an Ethereum HTTPS RPC in the local interface.'}\n\nSaved evidence can be read without internet. Fresh checks require an RPC. Test signing requires a compatible wallet and the exact allowlisted deployment. Mainnet broadcasting is disabled.\n\nThis archive associates the public address with an exit intention. Store or share it deliberately. No server RPC credentials, session cookies, or private keys are included.\n\nSHA256SUMS detects accidental changes. It does not authenticate the publisher; obtain a trusted release fingerprint separately. If the code itself is untrusted, do not run it merely because its own checksums match.\n`,
  );
  add(
    'THIRD_PARTY_NOTICES.txt',
    'ExitDrill: MIT. Bundled React: MIT. Viem: MIT. Vite build tooling: MIT. Fixture contracts use OpenZeppelin Contracts: MIT. No SavingsDai implementation is distributed in this kit.',
  );
  const sums =
    Object.keys(files)
      .sort()
      .map((p) => `${createHash('sha256').update(files[p]!).digest('hex')}  ${p}`)
      .join('\n') + '\n';
  add('SHA256SUMS', sums);
  return zipSync(
    Object.fromEntries(
      Object.keys(files)
        .sort()
        .map((p) => [
          'exitdrill-kit/' + p,
          [files[p]!, { mtime: new Date('2026-01-01T00:00:00Z') }],
        ]),
    ),
    { level: 6 },
  );
}
