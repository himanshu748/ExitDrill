# ExitDrill

Rehearse an ERC-4626 withdrawal, inspect what happened, and keep a local recovery kit that works without ExitDrill hosting.

Built from the existing Cursor PRD in this same repository. The complete specification is preserved in [`docs/PRD.md`](docs/PRD.md); measured results and remaining gates are in [`docs/STATUS.md`](docs/STATUS.md).

**Mainnet broadcasting is disabled.** All mainnet execution happens inside private Anvil forks. Wallet transactions are restricted to the exact allowlisted local test vaults. No approvals, custody, private keys, or recovery wallets are involved.

## Judge links

- Live app: https://jhahimanshu653--exitdrill-web.modal.run
- Pitch deck: [PDF](docs/submission/ExitDrill-pitch.pdf) · [editable PowerPoint](docs/submission/ExitDrill-pitch.pptx)
- [Rubric review](docs/RUBRIC.md) and [measured evidence](docs/evidence/)

The public demo resets on container restart. Its test chain RPC stays private. Export kits to preserve evidence; use the local setup below for fresh fixture checks.

## Run locally

Use Node.js 24 (tested: 24.9.0) and npm. The lockfile includes the Anvil binary package; a global Foundry installation is not needed for this prototype.

```sh
npm ci
npm run dev
```

Open **http://localhost:4310**. The launcher compiles and deploys four local test vaults on first run, builds the independent kit, and starts the API and Next.js interface. Anvil, API, and web services bind to loopback. Use the **Use test funds** button; these are disposable test assets.

For a production build and local preview:

```sh
npm run build
npm run preview
```

A production internet deployment needs a persistent host, TLS reverse proxy, configured origin, and reviewed RPC capacity. This checkout does not publish itself.

## Try your Ethereum position

Savings DAI on Ethereum is enabled for read-only inspection and private-fork rehearsal. Enter a public address that holds sDAI, or choose **Try a public sDAI position**. Use a small exact share amount such as `1`, run the rehearsal, and export the kit. No wallet connection is needed.

After extraction, open `START_HERE.html` to read saved evidence offline. For a fresh Ethereum preflight, run `node start.mjs` in the kit folder, open `http://127.0.0.1:4173`, and configure an Ethereum HTTPS RPC. The original app and API can be stopped. Mainnet broadcasting is disabled.

The repeat validation through the second provider passed on 22 September 2026. The source block, receipt, balances, and withdrawal event are saved in `docs/evidence/sdai-secondary-rehearsal.json`.

## Try the local test journey

1. Inspect the normal local vault using the test address.
2. Choose an exact amount or a percentage, then run the rehearsal.
3. Open the evidence and compare the source block with the private execution receipt.
4. Export the recovery kit and extract the ZIP.
5. Stop the hosted web/API services, then run `node start.mjs --local-fixture` in the extracted kit.
6. Open `http://127.0.0.1:4173`, configure `http://127.0.0.1:8545`, and run a fresh preflight. Keep the local test chain running for this step.

For a repeatable outage demo, run `npm run chain:start` in a separate terminal before `npm run dev`; the app launcher will reuse it, so stopping the app leaves the test chain available.

The kit uses no npm install, remote JavaScript, fonts, analytics, or hosted ExitDrill API. Previously saved evidence can be read offline. Current checks still require RPC connectivity. Test withdrawal signing additionally requires a compatible EIP-6963 wallet connected to local chain 31337 with the inspected test account. Never fund an Anvil development account with real assets.

The restricted vault reports zero redemption allowance. The reverting vault has a positive preview but its actual call fails. Both remain distinct from an unavailable RPC.

## Real sDAI evidence

The pinned SavingsDai source was compiled with solc 0.8.17 and compared with deployed runtime code, checking immutable values separately. A real positive public position was successfully redeemed inside a private fork, with receipt, event, share, underlying asset, and supply checks. The experiment neither proves ownership of that address nor sends a mainnet transaction.

Evidence is in `docs/evidence/`. Mainnet selection is enabled only after `npm run enable:sdai` finishes the second-provider validation and repeated fork. Public endpoints may reject archive reads or rate-limit; an interrupted run is UNKNOWN.

```sh
# Optional server-only settings, stored in .env or supplied through your shell environment:
# EXITDRILL_PRIMARY_RPC_URL
# EXITDRILL_SECONDARY_RPC_URL
# EXITDRILL_RPC_INTERVAL_MS
npm run validate:sdai
npm run enable:sdai
```

The research scripts default to public endpoints. User-provided RPC credentials must never be prefixed with `NEXT_PUBLIC_`, committed, or included in kit exports. The local kit requests its own connection and keeps the endpoint in process memory.

## Verify

With the local fixture chain running:

```sh
npm test
npm run typecheck
npm run verify:fixtures
npm run verify:kit
npm run format:check
npm run build
npm audit
```

`npm test` includes a real local transaction through a provider test harness and event/balance verification. That is separate from the not-yet-recorded injected-wallet extension demonstration. Browser testing confirmed the hosted workflow and independent kit preflight with hosted services stopped; release-level latency, comprehension, and complete accessibility testing remain open.

## Structure

- `apps/web`: Next.js product interface, PRD field-manual design.
- `apps/api`: Fastify sessions, snapshots, jobs, SQLite persistence, exports.
- `apps/worker`: private Anvil lifecycle, upstream read-only gateway, invariant checks.
- `apps/kit`: prebuilt React application and standalone Node launcher.
- `packages/domain`, `adapters`, `chain`, `evidence`, `ui`: shared exact arithmetic, plan construction, identity reads, reporting, and UI.
- `contracts/fixtures`: OpenZeppelin ERC-4626 test asset and controlled vaults.
- `registry`: candidate integration and optional validated registry.
- `docs/evidence`: measured reports, never fabricated receipt placeholders.

## Privacy and limits

Inspection reveals a public address and lookup intent to the server and its RPC provider. Anonymous session records expire after 24 hours; session deletion removes owned records. Exported files associate the address with an exit intention and remain under your control.

Checksums detect altered files; they do not authenticate an untrusted publisher. A source-block check and two RPC providers are consistency checks, not a trustless blockchain proof. The direct redemption method has no added minimum-output guarantee.

The API currently supervises one serial worker in the same process. Production process isolation, comprehensive lease recovery, measured load limits, wallet-extension validation, and production deployment hardening remain release work. See the status document before making public claims.

MIT application license. OpenZeppelin, React, and Viem retain their respective licenses. Upstream SavingsDai source is used for validation under AGPL-3.0; it is not redistributed in the kit. See `THIRD_PARTY_NOTICES`.

## Deploy the judge demo

With an authenticated Modal CLI, run `modal deploy deploy/modal_app.py`. The image installs CA certificates, compiles contracts, verifies all four fork outcomes, and builds both interfaces. It runs one container with loopback-only RPC/API and exposes only the web server through Modal TLS. The web server waits for API readiness. Disposable chain/session state resets when the container restarts; this is a prototype hosting configuration.
