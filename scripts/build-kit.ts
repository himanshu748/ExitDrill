import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const entries = JSON.parse(readFileSync('data/local/fixtures.json', 'utf8')).entries;
if (existsSync('registry/sdai-mainnet.validated.json'))
  entries.push(JSON.parse(readFileSync('registry/sdai-mainnet.validated.json', 'utf8')));
writeFileSync(
  'apps/kit/src/pinned-registry.ts',
  '// Generated from verified local fixture deployment. Rebuild after redeployment.\nexport const pinnedRegistry = ' +
    JSON.stringify(entries, null, 2) +
    ' as const;\n',
);
const result = spawnSync(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'build', 'apps/kit', '--config', 'apps/kit/vite.config.ts'],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
