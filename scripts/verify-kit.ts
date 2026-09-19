import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { unzipSync } from 'fflate';
import { exportKit } from '../packages/evidence/src/export.ts';
const report = JSON.parse(readFileSync('data/local/replay.json', 'utf8'));
const zip = await exportKit(report);
const files = unzipSync(zip);
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
