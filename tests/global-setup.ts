import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const RPC = 'http://127.0.0.1:8545';
let anvil: ChildProcess | undefined;

async function chainUp() {
  try {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function runScript(script: string) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(process.execPath, ['--import', 'tsx', script], { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(Error(`${script} failed`))));
  });
}

export async function setup() {
  if (!existsSync('artifacts/contracts.json')) await runScript('scripts/compile.ts');
  let fresh = false;
  if (!(await chainUp())) {
    anvil = spawn(
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
      { stdio: 'ignore' },
    );
    for (let i = 0; i < 50 && !(await chainUp()); i++) await new Promise((r) => setTimeout(r, 100));
    if (!(await chainUp())) throw Error(`Local Anvil did not start on ${RPC}`);
    fresh = true;
  }
  if (fresh || !existsSync('data/local/fixtures.json')) {
    const { deployFixtures } = await import('../scripts/fixtures.ts');
    const result = await deployFixtures(RPC);
    mkdirSync('data/local', { recursive: true });
    writeFileSync('data/local/fixtures.json', JSON.stringify(result, null, 2));
  }
}

export async function teardown() {
  anvil?.kill('SIGTERM');
}
