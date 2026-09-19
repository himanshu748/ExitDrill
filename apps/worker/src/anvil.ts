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
export async function startAnvil(fork?: { url: string; block: string }, fixedPort?: number) {
  const port = fixedPort ?? (await freePort());
  const url = `http://127.0.0.1:${port}`;
  const args = ['--host', '127.0.0.1', '--port', String(port), '--chain-id', '31337', '--silent'];
  if (fork)
    args.push('--fork-url', fork.url, '--fork-block-number', fork.block, '--no-storage-caching');
  const child = spawn(
    process.execPath,
    [resolve('node_modules/@foundry-rs/anvil/bin.mjs'), ...args],
    { stdio: 'ignore' },
  );
  let failed = false;
  child.on('error', () => {
    failed = true;
  });
  const timer = setTimeout(() => child.kill('SIGKILL'), 90000);
  timer.unref();
  const c = client(url);
  try {
    for (let i = 0; i < 120; i++) {
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
            child.kill('SIGTERM');
          },
        };
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    throw Error('ANVIL_TIMEOUT');
  } catch (e) {
    clearTimeout(timer);
    child.kill('SIGKILL');
    throw e;
  }
}
