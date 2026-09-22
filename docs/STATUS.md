# Implementation and verification status

Updated 22 September 2026. The original Cursor specification is preserved in `PRD.md`.

## Implemented

- Next.js interface with inspection, exact share input, real job events, evidence, recorded replay, and ZIP export.
- Fastify API with strict inputs, anonymous hashed session credentials, SQLite WAL persistence, per-session record access, expiration/deletion, request size/rate limits, idempotency, and bounded serial worker queue.
- Shared bigint arithmetic, checksummed address validation, canonical plan digest, direct-owner calldata reconstruction, and registry identity checks.
- Anvil supervisor with a fresh private fork per job, loopback binding, read-only upstream gateway, cleanup, gas disclosure, and receipt/event/balance/supply invariants.
- Four OpenZeppelin local vault configurations: normal, zero limit, positive cap, deterministic execution revert.
- Offline `START_HERE.html` with a direct evidence link and network-specific setup instructions.
- Standalone React bundle and built-in-Node launcher. ZIP contains no dependency install requirement. Host/Origin/token checks, read-only proxy, public IPv4 destination validation, explicit loopback fixture mode, no redirects, in-memory RPC configuration, SHA-256 file checks.
- Explicit wallet discovery and local-test-only transaction guard, fresh preflight, account/network invalidation, persisted ambiguous submission state, and receipt reconciliation.

## Verified evidence

On 22 September, live sDAI rehearsal also passed through the deployed app (job `f311e671-ccb9-4d2f-82c0-c3c56e7e24fd`): 1 sDAI produced 1.180831583669003968 DAI in its private fork. Its persisted event timestamps span about 23 seconds; this is one observation, not a latency distribution. A separate exported Ethereum kit passed current preflight with local web/API ports 4310 and 4311 stopped (`evidence/ethereum-kit-outage.json`). The outage check uncovered and fixed Node DNS callback handling for HTTPS RPCs.

| Check                                 | Evidence                                                                                                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local normal and capped redemption    | `evidence/fixture-rehearsals.json`: actual private-fork PASS                                                                                                                                                   |
| Restricted and reverting fixtures     | Same file: BLOCKED, no invented pass                                                                                                                                                                           |
| Public sDAI source/runtime comparison | `evidence/sdai-source-validation.json`: compiled pinned upstream commit with solc 0.8.17; executable bytes match after compiler metadata removal and immutable validation                                      |
| Genuine mainnet-state sDAI redemption | `evidence/sdai-fork-experiment.json`: positive real holder; 1 sDAI redeemed inside private Anvil fork; event/balance/supply invariants PASS                                                                    |
| Provider block agreement              | Real fork checked canonical source block through primary and secondary RPCs                                                                                                                                    |
| Hosted browser journey                | Public-address inspection → 250-share rehearsal → completed PASS → export review → ZIP download tested                                                                                                         |
| Standalone independence               | Extracted kit opened at a different origin with both web and API servers stopped; saved evidence loaded and fresh local call preflight succeeded                                                               |
| Small-screen kit reflow               | 390px viewport, 390px document width; no page horizontal overflow                                                                                                                                              |
| API/core tests                        | Run `npm test` for current count; includes session isolation, idempotency, mainnet denial, precision, input tampering, identity mismatch, transport failure, actual local transaction and receipt verification |
| Kit boundary tests                    | `npm run verify:kit`: extraction, checksum/tamper, origin rejection, SSRF rejection, denied send/control methods, live read-only RPC                                                                           |

## Release status and remaining gates

- sDAI read-only inspection and private-fork rehearsal are enabled after the second-provider validation and repeated execution passed on 22 September. Evidence: `evidence/sdai-secondary-rehearsal.json`. Public RPC errors still produce UNKNOWN. Mainnet broadcasting remains disabled.
- A real injected-wallet extension signing demonstration is not yet recorded. The automated provider harness submits a real local EVM transaction, but it is not evidence of wallet-extension compatibility. The in-app browser reports no injected wallet.
- Thirty-run latency distributions, five-person comprehension testing, full accessibility audit, and all failure-injection cases from the PRD are not completed.
- Public disposable demo deployed on Modal; all four hosted fixture outcomes verified in `evidence/hosted-fixtures.json`. Public testnet deployment is outside this prototype. Submission assets and live Devpost receipt are tracked separately.
- The API embeds its single worker scheduler in the same process for this local prototype. Separate process leases/retry recovery and a production reverse proxy remain deployment work.

A passing historical rehearsal is not a future-withdrawal guarantee or an audit. Mainnet broadcasts are blocked regardless of adapter status.
