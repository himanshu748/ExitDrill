## Inspiration

A vault balance can look reassuring while the exit remains untested. If the usual website disappears, a user may have to reconstruct a withdrawal under pressure. ExitDrill lets them rehearse that path beforehand and keep the tools needed to recheck it.

## What it does

ExitDrill inspects a supported ERC-4626 position at a pinned block and builds an exact direct redemption, with the owner also receiving the assets. It executes that plan inside a fresh private Anvil fork, then checks the transaction receipt, Withdrawal event, share burn, underlying asset increase, and total supply.

The report says PASS, BLOCKED, or UNKNOWN. A missing RPC response never becomes a zero balance or a successful exit. Estimates and observed output stay separate, and any fork gas top-up is disclosed.

The user can export a standalone recovery kit with a prebuilt interface, historical evidence, exact plan, Node launcher, and checksums. It opens without an npm install or the hosted ExitDrill API. Saved evidence works offline; a fresh preflight still needs an RPC connection. We verified the local kit after stopping both local web and API services.

## How we built it

The interface uses Next.js, React, and TypeScript. Fastify and SQLite handle anonymous sessions and persisted jobs. Viem constructs and checks calldata; Anvil executes isolated forks; OpenZeppelin powers four controlled ERC-4626 fixtures. The kit uses a separate Vite build and a Node-only launcher with a read-only RPC proxy.

The public demo lets judges try normal redemption, a zero redemption limit, a positive cap, and an execution revert using disposable test assets. Its chain and session data can reset when the demo container restarts. Export a report you want to keep. To run fresh kit checks for those fixtures, use the repository's local setup; the demo's internal test RPC is not exposed publicly.

## Ethereum evidence

A real sDAI position was rehearsed inside a private Ethereum-state fork at block 26,010,689. One sDAI produced 1.180713732702892348 DAI in that execution, and the receipt, event, balance, and supply checks passed. The source validation compiled a pinned SavingsDai revision with solc 0.8.17 and compared executable runtime bytes and immutable values.

That is historical fork evidence, using a public address as a hypothetical position. It does not establish wallet ownership. No mainnet transaction was sent. The live mainnet adapter remains disabled pending reliable repeat validation through a second RPC provider.

## Challenges and what we learned

A successful preview is weaker evidence than an executed redemption. The reverting fixture makes that distinction visible. Provider failures also need their own outcome: public archive RPC rate limits interrupted repeat mainnet validation, so those attempts remain unknown.

The outage test mattered as much as the hosted interface. The saved kit reconstructs the plan and checks it against current state instead of treating old evidence as permission to withdraw.

## Accomplishments

The prototype has 34 passing automated tests covering exact arithmetic, input tampering, session isolation, idempotency, identity changes, unavailable RPCs, and real local transaction reconciliation. Fixture verification produces the expected PASS or BLOCKED outcomes. Kit checks cover extraction, altered files, origin checks, SSRF rejection, and denied signing/control RPC methods.

The intended benefit is a repeatable way to prepare for an exit and retain an independent interface during an outage. We have not measured adoption or user comprehension yet.

## What's next

Complete the second-provider sDAI repeat run, record a real injected-wallet test, measure latency, and run accessibility and comprehension studies. Mainnet broadcasting remains disabled. Wallet transactions are limited to allowlisted local test deployments. ExitDrill cannot recover keys, bypass vault restrictions, or guarantee a future withdrawal.

## AI assistance and attribution

Cursor was used for the original PRD and initial project work. Codex continued implementation in the same folder, added tests, verified browser flows, and prepared the submission. The demo uses real app captures with synthetic narration. Third-party dependencies and SavingsDai validation sources are documented in the repository.

## Try it

Live demo: https://jhahimanshu653--exitdrill-web.modal.run

Repository: https://github.com/himanshu748/ExitDrill

Start with **Inspect a position**, choose **Use the local test address**, keep **Normal exit**, inspect, select **25%**, and run the rehearsal. Export a kit from the result. **Recorded demo** opens the historical sDAI fork report.

The repository includes setup instructions, measured evidence, and the pitch deck in `docs/submission/`.
