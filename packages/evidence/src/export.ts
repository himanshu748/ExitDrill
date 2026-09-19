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
  add(
    'data/report.html',
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ExitDrill saved evidence</title><h1>${escape(report.verdict)} · ${escape(report.environment)}</h1><p>${escape(report.reason)}</p><p>Historical evidence: ${escape(report.createdAt)}. Not a guarantee of future execution.</p><pre>${escape(JSON.stringify(report, null, 2))}</pre></html>`,
  );
  add(
    'START_HERE.md',
    `# ExitDrill local kit\n\nRequires Node.js 22+ and a browser; no npm install is needed.\n\nRun: node start.mjs\nFor this LOCAL_FIXTURE report, explicitly permit your own local test node with: node start.mjs --local-fixture\nOpen http://127.0.0.1:4173\n\nSaved evidence can be read without internet. Fresh checks require an RPC. Test signing requires a compatible wallet and the exact allowlisted deployment. Mainnet broadcasting is disabled.\n\nThis archive associates the public address with an exit intention. Store or share it deliberately. No server RPC credentials, session cookies, or private keys are included.\n\nSHA256SUMS detects accidental changes. It does not authenticate the publisher; obtain a trusted release fingerprint separately. If the code itself is untrusted, do not run it merely because its own checksums match.\n`,
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
