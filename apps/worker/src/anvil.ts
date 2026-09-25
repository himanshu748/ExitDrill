import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { client } from '../../../packages/chain/src/index.ts';
export async function freePort() {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const port = (s.address() as any).port;
  await new Promise<void>((r) => s.close(() => r()));
  return port as number;
}
const live = new Set<number>();
process.on('exit', () => {
  for (const pid of live)
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {}
});
export async function startAnvil(fork?: { url: string; block: string }, fixedPort?: number) {
  const port = fixedPort ?? (await freePort());
  const url = `http://127.0.0.1:${port}`;
  const args = ['--host', '127.0.0.1', '--port', String(port), '--chain-id', '31337', '--silent'];
  if (fork)
    args.push('--fork-url', fork.url, '--fork-block-number', fork.block, '--no-storage-caching');
  const child = spawn(
    process.execPath,
    [resolve('node_modules/@foundry-rs/anvil/bin.mjs'), ...args],
    // Own process group: the npm wrapper does not forward SIGKILL to the real anvil binary.
    { stdio: 'ignore', detached: true },
  );
  if (child.pid) live.add(child.pid);
  child.on('exit', () => live.delete(child.pid!));
  const kill = (signal: NodeJS.Signals) => {
    try {
      process.kill(-child.pid!, signal);
    } catch {}
  };
  let failed = false;
  child.on('error', () => {
    failed = true;
  });
  const timer = setTimeout(() => kill('SIGKILL'), 180000);
  timer.unref();
  // A forked estimate can read many remote storage slots before replying.
  const c = client(url, fork ? 90000 : 12000);
  try {
    // Remote forks need time to fetch their source header through the read-only gateway.
    // Keep a wall-clock bound rather than treating slow RPC startup as contract failure.
    const deadline = Date.now() + (fork ? 45000 : 12000);
    while (Date.now() < deadline) {
      if (failed || child.exitCode !== null) throw Error('ANVIL_UNAVAILABLE');
      try {
        await c.getChainId();
        return {
          url,
          port,
          c,
          child,
          stop: () => {
            clearTimeout(timer);
            kill('SIGTERM');
          },
        };
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    throw Error('ANVIL_TIMEOUT');
  } catch (e) {
    clearTimeout(timer);
    kill('SIGKILL');
    throw e;
  }
}
