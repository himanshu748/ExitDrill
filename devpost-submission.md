Problem statement

A vault balance can look reassuring while the exit remains untested. If the usual website disappears, a user may have to reconstruct a withdrawal under pressure. ExitDrill lets them rehearse that path beforehand and keep the tools needed to recheck it.

Solution and unique value

ExitDrill inspects a supported ERC-4626 position at a pinned block and builds an exact direct redemption, with the owner also receiving the assets. It executes that plan inside a fresh private Anvil fork, then checks the transaction receipt, Withdrawal event, share burn, underlying asset increase, and total supply.

The report says PASS, BLOCKED, or UNKNOWN. A missing RPC response never becomes a zero balance or a successful exit. Estimates and observed output stay separate, and any fork gas top-up is disclosed.

The user can export a standalone recovery kit with a prebuilt interface, historical evidence, exact plan, Node launcher, and checksums. It opens without an npm install or the hosted ExitDrill API. Saved evidence works offline; a fresh preflight still needs an RPC connection. On 22 September, I verified a fresh Ethereum call preflight from an exported kit after stopping both local web and API services. The kit now includes START_HERE.html with an offline evidence link and setup instructions.

Technology and working prototype

The live app supports Savings DAI on Ethereum for read-only inspection and private-fork rehearsal. It also offers four disposable ERC-4626 test vaults on a private Anvil EVM chain (chain ID 31337). Mainnet broadcasting is disabled.

The interface uses Next.js, React, and TypeScript. Fastify and SQLite handle anonymous sessions and persisted jobs. Viem constructs and checks calldata; Anvil executes isolated forks; OpenZeppelin powers four controlled ERC-4626 fixtures. The kit uses a separate Vite build and a Node-only launcher with a read-only RPC proxy.

The public demo lets judges try normal redemption, a zero redemption limit, a positive cap, and an execution revert using disposable test assets. Its chain and session data can reset when the demo container restarts. Export a report you want to keep. To run fresh kit checks for those fixtures, use the repository's local setup; the demo's internal test RPC is not exposed publicly.

Ethereum evidence

A real sDAI position was rehearsed inside a private Ethereum-state fork at block 26,010,689. One sDAI produced 1.180713732702892348 DAI in that execution, and the receipt, event, balance, and supply checks passed. The source validation compiled a pinned SavingsDai revision with solc 0.8.17 and compared executable runtime bytes and immutable values.

That is historical fork evidence, using a public address as a hypothetical position. It does not establish wallet ownership. No mainnet transaction was sent. The second-provider validation and repeated fork passed on 22 September, enabling live sDAI inspection and rehearsal. A fresh hosted browser run also passed: one sDAI produced 1.180831583669003968 DAI in its private fork. That run's worker steps took about 23 seconds; this is one observation, not a latency distribution.

Measured reliability

On 23 September, I ran 30 sequential hosted journeys with fresh inspections and no retries: all 20 Ethereum sDAI rehearsals and all 10 local-fixture rehearsals passed. Ethereum latency, including inspection, queue, execution, and two-second polling, had a median of 22.039 seconds and a 95th percentile of 22.416 seconds. Local-fixture median latency was 5.458 seconds. This warm-service sample does not measure cold starts, concurrent load, or future reliability. Every attempt and receipt is published at https://github.com/himanshu748/ExitDrill/blob/main/docs/evidence/hosted-reliability.json .

I also repeated the browser export and app-off kit check on 23 September: after stopping local web/API services, the downloaded kit completed a fresh local call preflight. Five new tests cover RPC loss after inspection, a changed source block, account/network changes during wallet preflight, and a reverted wallet call. The kit rejected a public RPC certificate mismatch from the local machine; an explicit check through the secondary HTTPS provider passed without bypassing TLS verification.

Challenges and what I learned

A successful preview is weaker evidence than an executed redemption. The reverting fixture makes that distinction visible. Provider failures also need their own outcome: public archive RPC errors interrupted some validation attempts. Longer bounded fork timeouts and paced RPC reads allowed the second-provider repeat to complete; interrupted attempts remain UNKNOWN. The Ethereum outage test also exposed a Node.js DNS callback incompatibility in the kit's HTTPS proxy, which is now fixed and verified against a public RPC.

The outage test mattered as much as the hosted interface. The saved kit reconstructs the plan and checks it against current state instead of treating old evidence as permission to withdraw.

Accomplishments

The prototype has 41 passing automated tests covering exact arithmetic, input tampering, session isolation, idempotency, identity changes, unavailable RPCs, per-client rate limits and real local transaction reconciliation. `npm test` starts its own local chain, so it passes from a fresh clone. Fixture verification produces the expected PASS or BLOCKED outcomes. Kit checks cover extraction, altered files, origin checks, SSRF rejection, and denied signing/control RPC methods.

The intended benefit is a repeatable way to prepare for an exit and retain an independent interface during an outage. I have not measured adoption or user comprehension yet.

What's next

Record a real injected-wallet test and run full accessibility and comprehension studies. The available in-app browser has no compatible injected wallet; the existing local transaction test uses an automated provider harness. A five-person task-based usability protocol is included in the repository; no participant results are claimed. Mainnet broadcasting remains disabled. Wallet transactions are limited to allowlisted local test deployments. ExitDrill cannot recover keys, bypass vault restrictions, or guarantee a future withdrawal.

AI assistance and attribution

Cursor was used for the original PRD and initial project work. Codex continued implementation in the same folder, added tests, verified browser flows, and prepared the submission. On 24 and 25 September, Claude Code audited the code and live demo, then fixed what it found: a shared rate limit across all visitors, orphaned fork processes, zero-asset redemptions reported as PASS and unreadable result numbers. The demo uses real app captures with synthetic narration. Third-party dependencies and SavingsDai validation sources are documented in the repository.

Try it

Live demo: https://jhahimanshu653--exitdrill-web.modal.run

Repository: https://github.com/himanshu748/ExitDrill

Start with Inspect a position and choose Try a public sDAI position, or enter an address holding sDAI. Inspect, enter 1 share, and run the rehearsal. Export a kit from the result. For disposable funds, choose Use test funds. Recorded demo remains a clearly labeled historical report.

Pitch deck: View the six-slide PDF. It covers the problem, solution, technology, withdrawal evidence, independent kit, and future scope. The intended impact is to help vault users prepare an exit and retain a way to check it during a hosting outage; user outcomes have not yet been measured.

Demo video: Watch the recorded walkthrough.

Local setup: clone the repository, use Node.js 24, run npm ci and npm run dev, then open http://localhost:4310. No wallet connection is needed for inspection or rehearsal. See the README for the complete setup and independent-kit instructions.

For a failure case, choose Execution reverts and repeat the rehearsal. Its positive preview must still result in BLOCKED when execution fails. The Redemption restricted fixture has a zero limit; Limited redemption demonstrates a positive cap. A missing RPC response remains UNKNOWN.
