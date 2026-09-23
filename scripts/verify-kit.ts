import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { unzipSync, strFromU8 } from 'fflate';
import { exportKit } from '../packages/evidence/src/export.ts';
const report = JSON.parse(readFileSync('data/local/replay.json', 'utf8'));
const zip = await exportKit(report);
const files = unzipSync(zip);
const guide = strFromU8(files['exitdrill-kit/START_HERE.html']!);
if (!guide.includes('href="data/report.html"') || !guide.includes('--local-fixture'))
  throw Error('Offline entry point or fixture guidance missing');
const hostile = structuredClone(report);
hostile.environment = 'MAINNET_FORK';
hostile.reason = '<img src=x onerror="alert(1)">';
const mainnetFiles = unzipSync(await exportKit(hostile));
const mainnetGuide = strFromU8(mainnetFiles['exitdrill-kit/START_HERE.html']!);
if (mainnetGuide.includes('<img') || !mainnetGuide.includes('&lt;img'))
  throw Error('Untrusted report text was not escaped');
if (mainnetGuide.includes('--local-fixture') || !mainnetGuide.includes('Ethereum HTTPS RPC'))
  throw Error('Mainnet guide contains fixture instructions');
for (const [p, data] of Object.entries(files)) {
  const out = resolve('work/extracted', p);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, data);
}
writeFileSync('work/exitdrill-kit.zip', zip);
const child = spawn(
  process.execPath,
  ['work/extracted/exitdrill-kit/start.mjs', '--local-fixture'],
  { env: { ...process.env, EXITDRILL_KIT_PORT: '4174' }, stdio: 'ignore' },
);
try {
  let boot: any;
  for (let i = 0; i < 40; i++) {
    try {
      boot = await fetch('http://127.0.0.1:4174/bootstrap').then((r) => r.json());
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!boot?.integrity.matches) throw Error('Kit integrity failed');
  const headers = {
    origin: 'http://127.0.0.1:4174',
    'x-exitdrill-token': boot.token,
    'content-type': 'application/json',
  };
  const post = (p: string, data: any, h = headers) =>
    fetch('http://127.0.0.1:4174' + p, { method: 'POST', headers: h, body: JSON.stringify(data) });
  for (const method of [
    'eth_sendTransaction',
    'eth_sendRawTransaction',
    'anvil_setBalance',
    'personal_sign',
  ])
    if ((await post('/rpc', { method, params: [] })).status !== 403)
      throw Error('Unsafe RPC allowed');
  if ((await post('/configure', { url: 'http://169.254.169.254/latest/meta-data' })).status !== 503)
    throw Error('SSRF destination allowed');
  if (
    (
      await post(
        '/configure',
        { url: 'http://127.0.0.1:8545' },
        { ...headers, origin: 'https://evil.example' },
      )
    ).status !== 403
  )
    throw Error('Bad origin allowed');
  if ((await post('/configure', { url: 'http://127.0.0.1:8545' })).status !== 200)
    throw Error('Local configuration failed');
  const chain = await (
    await post('/rpc', { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] })
  ).json();
  if (chain.result !== '0x7a69') throw Error('RPC failed');
  if (process.env.EXITDRILL_VERIFY_PUBLIC_RPC === '1') {
    if (
      (
        await post('/configure', {
          url: process.env.EXITDRILL_KIT_TEST_RPC || 'https://ethereum-rpc.publicnode.com',
        })
      ).status !== 200
    )
      throw Error('Public HTTPS configuration failed');
    const ethereum = await (
      await post('/rpc', { jsonrpc: '2.0', id: 2, method: 'eth_chainId', params: [] })
    ).json();
    if (ethereum.result !== '0x1') throw Error('Public HTTPS DNS-pinned forwarding failed');
    console.log(
      'Public HTTPS RPC verified through extracted launcher (Node DNS all-address mode).',
    );
  }
  writeFileSync('work/extracted/exitdrill-kit/data/plan.json', '{}');
  const tampered = await fetch('http://127.0.0.1:4174/bootstrap').then((r) => r.json());
  if (tampered.integrity.matches) throw Error('Tampering not detected');
  writeFileSync(
    'work/extracted/exitdrill-kit/data/plan.json',
    files['exitdrill-kit/data/plan.json']!,
  );
  console.log(
    'Kit checks passed: ZIP extraction, integrity, tamper detection, Host/Origin boundary, SSRF denial, submission/control-method denial, real local RPC.',
  );
} finally {
  child.kill('SIGTERM');
}
