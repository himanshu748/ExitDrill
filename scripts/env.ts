import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
// Provider errors can contain credential-bearing URLs; research commands report only their class.
process.on('uncaughtException', (error: Error) => {
  console.error(
    `Integration check stopped (${error.name}). No new enablement is asserted. Check RPC availability and the saved evidence.`,
  );
  process.exitCode = 1;
});
