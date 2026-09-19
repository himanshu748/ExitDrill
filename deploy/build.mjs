import { spawn, spawnSync } from 'node:child_process';
const chain = spawn(
  process.execPath,
  [
    'node_modules/@foundry-rs/anvil/bin.mjs',
    '--host',
    '127.0.0.1',
    '--port',
    '8545',
    '--chain-id',
    '31337',
    '--silent',
  ],
  { stdio: 'inherit' },
);
try {
  await new Promise((r) => setTimeout(r, 1500));
  for (const args of [
    ['--import', 'tsx', 'scripts/fixtures.ts'],
    ['--import', 'tsx', 'scripts/verify-fixtures.ts'],
    ['node_modules/tsx/dist/cli.mjs', 'scripts/build-kit.ts'],
    ['node_modules/next/dist/bin/next', 'build', 'apps/web'],
  ]) {
    const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('Image build failed');
  }
} finally {
  chain.kill('SIGTERM');
}
