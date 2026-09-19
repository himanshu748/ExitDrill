import { spawn, spawnSync } from 'node:child_process';
const processes = [];
function start(args) {
  const p = spawn(process.execPath, args, { stdio: 'inherit' });
  processes.push(p);
  p.on('exit', () => {
    for (const sibling of processes) sibling.kill('SIGTERM');
    process.exit(1);
  });
  return p;
}
start([
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
const setup = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/fixtures.ts'], {
  stdio: 'inherit',
});
if (setup.status !== 0) process.exit(1);
start(['--import', 'tsx', 'apps/api/src/server.ts']);
for (let n = 0; n < 120; n++) {
  try {
    if ((await fetch('http://127.0.0.1:4311/health/live')).ok) break;
  } catch {}
  if (n === 119) throw new Error('API did not become ready');
  await new Promise((r) => setTimeout(r, 250));
}
start([
  'node_modules/next/dist/bin/next',
  'start',
  'apps/web',
  '--hostname',
  '0.0.0.0',
  '--port',
  '4310',
]);
