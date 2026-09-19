import solc from 'solc';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const input = {
  language: 'Solidity',
  sources: {
    'DrillVault.sol': { content: readFileSync('contracts/fixtures/DrillVault.sol', 'utf8') },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'cancun',
    outputSelection: {
      '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] },
    },
  },
};
const output = JSON.parse(
  solc.compile(JSON.stringify(input), {
    import: (p: string) => {
      try {
        return { contents: readFileSync('node_modules/' + p, 'utf8') };
      } catch {
        return { error: 'Import unavailable' };
      }
    },
  }),
);
if (output.errors?.some((x: any) => x.severity === 'error'))
  throw Error(JSON.stringify(output.errors));
mkdirSync('artifacts', { recursive: true });
writeFileSync(
  'artifacts/contracts.json',
  JSON.stringify(output.contracts['DrillVault.sol'], null, 2),
);
console.log('Compiled OpenZeppelin fixture contracts with solc', solc.version());
