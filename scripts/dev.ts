import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
const procs: ReturnType<typeof spawn>[] = [];
const run = (cmd: string, args: string[]) => {
  const p = spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, WATCHPACK_POLLING: 'true' },
  });
  procs.push(p);
  return p;
};
async function finish(p: ReturnType<typeof spawn>) {
  await new Promise<void>((res, rej) =>
    p.on('exit', (code) => (code === 0 ? res() : rej(Error('Setup command failed')))),
  );
}
if (existsSync('.env')) process.loadEnvFile('.env');
if (!existsSync('artifacts/contracts.json'))
  await finish(run(process.execPath, ['--import', 'tsx', 'scripts/compile.ts']));
try {
  await fetch('http://127.0.0.1:8545', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
  });
} catch {
  run(process.execPath, [
    'node_modules/@foundry-rs/anvil/bin.mjs',
    '--host',
    '127.0.0.1',
    '--port',
    '8545',
    '--chain-id',
    '31337',
    '--silent',
  ]);
  await new Promise((r) => setTimeout(r, 1500));
  await finish(run(process.execPath, ['--import', 'tsx', 'scripts/fixtures.ts']));
}
if (!existsSync('data/local/fixtures.json'))
  await finish(run(process.execPath, ['--import', 'tsx', 'scripts/fixtures.ts']));
if (!existsSync('apps/kit/dist/index.html')) await finish(run('npm', ['run', 'build:kit']));
run(process.execPath, ['--import', 'tsx', 'apps/api/src/server.ts']);
run('npm', [
  'run',
  process.env.EXITDRILL_PRODUCTION === '1' ? 'start' : 'dev',
  '-w',
  '@exitdrill/web',
]);
function stop() {
  for (const p of procs) p.kill('SIGTERM');
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
