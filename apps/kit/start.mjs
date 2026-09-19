import { createServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { lookup } from 'node:dns/promises';
import { readFileSync, existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const token = randomBytes(32).toString('hex');
let endpoint = null;
const localMode = process.argv.includes('--local-fixture');
const port = Number(process.env.EXITDRILL_KIT_PORT ?? 4173);
const authority = `127.0.0.1:${port}`;
const origin = `http://${authority}`;
const allowed = new Set([
  'eth_chainId',
  'eth_blockNumber',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getBalance',
  'eth_call',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getTransactionReceipt',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
]);
export function publicIP(ip) {
  if (ip.includes(':')) return false; // Reject IPv6 and mapped addresses rather than accepting ambiguous destinations.
  const a = ip.split('.').map(Number);
  if (a.length !== 4 || a.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  return !(
    a[0] === 0 ||
    a[0] === 10 ||
    a[0] === 127 ||
    a[0] >= 224 ||
    (a[0] === 169 && a[1] === 254) ||
    (a[0] === 172 && a[1] >= 16 && a[1] <= 31) ||
    (a[0] === 192 && (a[1] === 168 || a[1] === 0)) ||
    (a[0] === 100 && a[1] >= 64 && a[1] <= 127) ||
    (a[0] === 198 && (a[1] === 18 || a[1] === 19))
  );
}
async function destination(value) {
  const u = new URL(value);
  if (u.username || u.password || u.hash) throw Error('Unsupported RPC URL');
  if (localMode && u.protocol === 'http:' && u.hostname === '127.0.0.1' && u.port === '8545')
    return { url: u, ip: '127.0.0.1' };
  if (u.protocol !== 'https:' || (u.port && u.port !== '443'))
    throw Error('Use a public HTTPS RPC endpoint');
  const answers = await lookup(u.hostname, { all: true, family: 4 });
  if (!answers.length || answers.some((x) => !publicIP(x.address)))
    throw Error('Private destinations are denied');
  return { url: u, ip: answers[0].address };
}
async function forward(payload) {
  if (!endpoint) throw Error('Configure an RPC first');
  const d = await destination(endpoint);
  return new Promise((resolve, reject) => {
    const call = (d.url.protocol === 'https:' ? httpsRequest : httpRequest)(
      d.url,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        lookup: (_h, _o, cb) => cb(null, d.ip, 4),
        timeout: 12000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(Error('RPC unavailable'));
          return;
        }
        let text = '';
        res.on('data', (chunk) => {
          text += chunk;
          if (text.length > 2e6) {
            call.destroy();
            reject(Error('RPC response too large'));
          }
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(text));
          } catch {
            reject(Error('Invalid RPC response'));
          }
        });
      },
    );
    call.on('timeout', () => call.destroy(Error('RPC timeout')));
    call.on('error', () => reject(Error('RPC unavailable')));
    call.end(JSON.stringify(payload));
  });
}
function integrity() {
  if (!existsSync(resolve(root, 'SHA256SUMS')))
    return { matches: false, reason: 'Checksum list missing' };
  const mismatches = [];
  for (const line of readFileSync(resolve(root, 'SHA256SUMS'), 'utf8').trim().split('\n')) {
    const [hash, path] = line.split('  ');
    if (!path || path.includes('..') || path.startsWith('/')) {
      mismatches.push('Invalid checksum entry');
      continue;
    }
    try {
      if (
        createHash('sha256')
          .update(readFileSync(resolve(root, path)))
          .digest('hex') !== hash
      )
        mismatches.push(path);
    } catch {
      mismatches.push(path);
    }
  }
  return {
    matches: mismatches.length === 0,
    mismatches,
    provenance: 'Checksums detect corruption; publisher authenticity is not verified.',
  };
}
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
  );
  const json = (status, data) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  if (req.headers.host !== authority || (req.headers.origin && req.headers.origin !== origin))
    return json(403, { error: 'Host or origin rejected' });
  try {
    const pathname = new URL(req.url, origin).pathname;
    if (pathname === '/bootstrap' && req.method === 'GET')
      return json(200, { token, localMode, integrity: integrity() });
    if (req.method === 'POST') {
      if (req.headers.origin !== origin || req.headers['x-exitdrill-token'] !== token)
        return json(403, { error: 'Local session rejected' });
      let body = '';
      for await (const part of req) {
        body += part;
        if (body.length > 16384) return json(413, { error: 'Request too large' });
      }
      const data = JSON.parse(body);
      if (pathname === '/configure') {
        await destination(data.url);
        endpoint = data.url;
        return json(200, { configured: true });
      }
      if (pathname === '/rpc') {
        if (
          Array.isArray(data) ||
          !allowed.has(data.method) ||
          (data.params !== undefined && !Array.isArray(data.params))
        )
          return json(403, { error: 'Read-only RPC method required' });
        return json(200, await forward(data));
      }
      return json(404, { error: 'Unknown endpoint' });
    }
    if (req.method !== 'GET') return json(405, { error: 'Method denied' });
    let file;
    if (pathname.startsWith('/data/')) {
      if (
        ![
          '/data/manifest.json',
          '/data/registry.json',
          '/data/plan.json',
          '/data/receipt.json',
          '/data/report.html',
        ].includes(pathname)
      )
        return json(404, { error: 'Not found' });
      file = resolve(root, '.' + pathname);
    } else {
      file = resolve(root, 'public', '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(resolve(root, 'public') + '/'))
        return json(403, { error: 'Path denied' });
    }
    if (!existsSync(file)) return json(404, { error: 'Not found' });
    res.setHeader(
      'content-type',
      {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
      }[extname(file)] ?? 'application/octet-stream',
    );
    res.end(readFileSync(file));
  } catch {
    return json(503, {
      error: 'The local request could not be completed. Check the endpoint and connection.',
    });
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(
    `ExitDrill local kit: ${origin}\n${localMode ? 'Local fixture RPC permitted on 127.0.0.1:8545.' : 'Public HTTPS RPC only.'}\nRPC credentials stay in memory. Mainnet broadcasting is disabled.`,
  ),
);
