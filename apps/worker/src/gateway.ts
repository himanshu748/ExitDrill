import { paced } from '../../../packages/chain/src/index.ts';
import { createServer } from 'node:http';
const READS = new Set([
  'eth_chainId',
  'eth_blockNumber',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getCode',
  'eth_getBalance',
  'eth_getStorageAt',
  'eth_getTransactionCount',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_call',
  'eth_gasPrice',
  'eth_feeHistory',
  'eth_getProof',
  'net_version',
]);
export function readOnlyMethod(method: unknown) {
  return typeof method === 'string' && READS.has(method);
}
export async function readGateway(upstream: string) {
  const server = createServer(async (req, res) => {
    try {
      let body = '';
      for await (const part of req) {
        body += part;
        if (body.length > 65536) {
          res.writeHead(413);
          res.end();
          return;
        }
      }
      const payload = JSON.parse(body);
      const calls = Array.isArray(payload) ? payload : [payload];
      if (calls.length > 100 || calls.some((x: any) => !readOnlyMethod(x.method))) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Read-only upstream methods only' }));
        return;
      }
      const response = await paced(upstream, () =>
        fetch(upstream, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
        }),
      );
      if (!response.ok) throw Error();
      const data = await response.text();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(data);
    } catch {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'Upstream unavailable' }));
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as any).port;
  return {
    url: `http://127.0.0.1:${port}`,
    stop: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}
