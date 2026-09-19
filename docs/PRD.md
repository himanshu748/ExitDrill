# ExitDrill
## Product Requirements, Design System, and Backend Specification

**A fire drill for your DeFi exit.**

| Document control | Value |
|---|---|
| Version | 1.0 |
| Date | 18 September 2026 |
| Product owner | Himanshu Kumar, `himanshu748` |
| Target event | 3rd-Web-Hack |
| Submission deadline | 27 September 2026, 12:30 PM IST [S01, S03] |
| Internal submission target | 26 September 2026 |
| Status | Implementation specification. No software implementation or integration is asserted by this document. |
| Document structure | PRD, embedded `design.md`, backend design, security model, acceptance tests, and delivery plan |

> **Product promise:** Test a supported withdrawal before the usual website disappears. Keep the instructions and tools needed to inspect that exit independently.
>
> **v0 safety boundary:** Ethereum mainnet inspection and fork rehearsal; actual wallet-signed withdrawals only against allowlisted test deployments. The public app and exported kit do not broadcast mainnet transactions.

This document is the implementation source of truth. Requirements and targets are proposed product decisions, not measured results. External technical facts use source references collected in Section 27. No protocol integration, contract address deployment, test result, audit, user study, or transaction receipt has been fabricated.

# Part I. Product requirements

## 1. Executive decision

Build a focused withdrawal-rehearsal product, not a universal DeFi dashboard, autonomous rescue agent, or new custody protocol.

The first release supports one reviewed synchronous ERC-4626 integration. The initial integration target is Savings DAI, or sDAI, on Ethereum. Its maintainers publish an ERC-4626 implementation and a mainnet deployment reference. That establishes a credible integration target, not evidence that this PRD has verified its current withdrawability. Enabling the adapter requires the integration gates in Section 10. [S05, S06]

The product has one central journey:

**Inspect a supported position → rehearse an exact exit → inspect the evidence → export a standalone kit → repeat a current preflight without the hosted application.**

The hackathon demonstration adds a test-funds withdrawal after the normal interface and ExitDrill's hosted services have been disabled.

### 1.1 Non-negotiable decisions

| Decision | Required implementation |
|---|---|
| Scope | One real vault integration; controlled test vaults for failure demonstrations |
| Exit operation | Direct `redeem` of a user-selected share amount; owner and receiver are the same address |
| Ownership | Watch-only inspection is allowed. Inspection does not prove control of a wallet. |
| Custody | ExitDrill never asks for a seed phrase, private key, custody deposit, or token approval |
| Signing | Explicit user confirmation in an injected wallet; test deployments only in v0 |
| Evidence | A precise result with provenance and limitations, not a safety score |
| Standalone operation | No runtime dependency on ExitDrill hosting, a protocol frontend, remote JavaScript, a CDN, or an AI service |
| AI | Not required for P0. Optional explanation only after deterministic checks exist. |
| Mainnet deployment | No ExitDrill custody, router, or recovery contract is deployed to mainnet |

### 1.2 What makes the product worth building

The proposed differentiator is preparation and verifiable rehearsal, not merely another contract interaction screen. The product should make a user able to answer: what was tested, what happened, what remains uncertain, and what independent tooling they have saved.

Do not claim ExitDrill invented emergency withdrawals or is the first product in this category. Demonstrate the specific combination that works.

## 2. Hackathon constraints and submission strategy

The event asks for a real Blockchain/Web3 problem, meaningful use of the technology, a working prototype, source code with setup instructions, a demo, and a brief presentation. The rules require original work developed for the hackathon. Its published judging criteria are innovation, technical feasibility, uniqueness, and design. [S01, S02]

The schedule lists submission close on 27 September 2026 at 12:30 PM IST and winner announcement on 3 October 2026 at 9:00 AM IST. The overview advertises 500, 200, and 50 USDT prizes. These are organizer-published details, not guarantees of payment. [S01, S03]

Eligibility wording differs: the overview says students only and includes age restrictions, while the rules page refers to students and developers. Preserve the published restrictions and verify eligibility before submitting. Do not assume registration or submission has already occurred. [S01, S02]

| Judging dimension | Product evidence to present |
|---|---|
| Innovation | A withdrawal rehearsal with explicit assumptions and a portable recovery kit |
| Technical feasibility | Actual state-changing execution on a pinned fork, plus a wallet-signed test-funds transaction |
| Uniqueness | A blocked-exit diagnosis and a demonstration that the kit survives loss of hosted services |
| Design | Understandable results, clear provenance, complete failure states, and deliberate evidence disclosure |

Use a new repository and maintain an honest development history. Attribute reused libraries and test tooling. Reusing a general dependency is different from relabeling a previous project.

## 3. Problem, users, and jobs

### 3.1 Problem statement

A person holding a supported vault position may know the website where they deposited, but not the contract, method, parameters, or dependencies needed to exit. A broken interface can therefore become an operational obstacle even where a contract interaction remains possible.

ExitDrill addresses that dependency and knowledge gap. It does not establish that a vault is solvent, restore missing keys, overcome contractual restrictions, or guarantee future transaction outcomes.

### 3.2 Primary users

| User | Job to be done | Useful outcome |
|---|---|---|
| Individual vault holder | Rehearse an exit before an incident | A tested plan and locally saved kit |
| Holder facing a frontend outage | Inspect the supported position without the normal website | Current contract checks and understandable next steps |
| Protocol maintainer | Show an alternative interaction path | A repeatable dependency-failure demonstration |
| Hackathon evaluator | Verify the product's claims without risking funds | A replay, evidence files, and a test-funds walkthrough |

P0 prioritizes an individual using a desktop browser with an injected wallet. Mobile supports inspection and reading reports, not a promise of full standalone signing compatibility.

### 3.3 Core journeys

**Prepare:** A user enters a public address, selects the supported vault, sees the recorded position and limits, chooses shares to redeem, and runs a drill. They inspect the result and save the kit.

**Use the saved kit:** A user launches the downloaded local application, reviews its provenance and old report, configures an RPC connection, and runs a fresh contract-call preflight. Testnet users can continue to explicit wallet signing.

**Discover a blocker:** A user sees that the supported vault reports no redeemable shares or that the exact interaction reverts. The report identifies the observed evidence without claiming that a different interface can bypass it.

**Lose connectivity:** A user can read previously saved evidence, but receives an unknown current-state result. The interface must not convert missing data into a successful or blocked withdrawal claim.

## 4. Goals, non-goals, and success criteria

### 4.1 Goals

Deliver one complete, reproducible journey from position inspection to independent kit use. Make the difference between a rehearsal, a preflight, and a submitted transaction immediately visible. Explain failures in language supported by the observed evidence. Prevent accidental mainnet signing in all shipped v0 interfaces.

### 4.2 Non-goals

No universal portfolio indexing, leverage unwind, lending collateral management, bridges, swaps, cross-chain recovery, yield recommendations, fiat pricing, lost-key recovery, arbitrary contract execution, asynchronous withdrawal queues, smart-wallet execution, or account abstraction in P0.

No token, NFT certificate, on-chain report notarization, referral system, subscription billing, social feed, public wallet leaderboard, or autonomous transaction agent.

Async vault workflows are deliberately excluded. ERC-7540 introduces request-based asynchronous behavior that requires a different lifecycle rather than a cosmetic addition to this MVP. [S07]

### 4.3 Acceptance metrics

All values below are release targets, not current performance claims.

| Metric | Target and measurement |
|---|---|
| Core journey | Complete every P0 acceptance scenario in Section 23 |
| Independent operation | Fresh kit session works with hosted services unavailable and caches cleared |
| False positive prevention | Zero passing verdicts for the defined blocked, unsupported, and transport-failure fixtures |
| Mainnet protection | Zero mainnet send or signature requests in automated wallet interception tests |
| Inspection latency | p95 at or below 5 seconds over 30 measured warm requests to configured infrastructure |
| Rehearsal latency | p95 at or below 45 seconds over 30 completed single-concurrency runs; report queue time separately |
| Unknown outcome handling | No automatic resubmission after an ambiguous wallet or network failure |
| Comprehension | At least 4 of 5 recruited testers distinguish rehearsal success from guaranteed withdrawal |
| Export privacy | No private keys, RPC credentials, server secrets, session credentials, or hidden analytics in any exported kit |

A missed latency target should be reported and improved. It must not cause fixture results to be substituted for a live run.

## 5. Prioritized scope

### 5.1 P0: required for submission

| ID | Capability | Release condition |
|---|---|---|
| FR-01 | Public-address inspection | No wallet signature or login required; scan only the enabled registry |
| FR-02 | Reviewed adapter registry | Chain, contract identity, asset identity, ABI, and version are pinned |
| FR-03 | Position and limit view | Share balance and applicable exit information come from the same source block |
| FR-04 | Exact redemption plan | One deterministic call with sender, owner, and receiver fixed to the inspected address |
| FR-05 | Full fork rehearsal | Execute the plan in an isolated fork and inspect before/after balances and receipt |
| FR-06 | Honest result classification | Distinguish success, blocked, unknown, unsupported, and no position |
| FR-07 | Evidence receipt | Export block provenance, plan, observations, adjustments, and limitations |
| FR-08 | Standalone kit | Prebuilt local UI plus launcher, data, checksums, and instructions |
| FR-09 | Current local preflight | Rebuild and check a plan without the hosted API or worker |
| FR-10 | Test-funds signing | Explicit wallet confirmation for allowlisted fixture deployments only |
| FR-11 | Failure demonstration | Successful exit, blocked vault, unavailable RPC, and unavailable hosted services |
| FR-12 | Delivery quality | Responsive UI, accessibility checks, reproducible setup, demo, and presentation |

### 5.2 P1: only after the complete journey passes

A second reviewed synchronous adapter; local full-fork rehearsal using an already installed Anvil; deeper trace visualization; independently verifiable release signatures; opt-in local drill history; an evidence-grounded explanation assistant.

### 5.3 P2: post-hackathon research

Mainnet transaction broadcasting after independent review and explicit release approval; smart-wallet support; asynchronous exit adapters; multi-step positions; reproducible packaged runtimes; stronger RPC verification.

Mainnet broadcasting is not a hidden feature flag in v0. It requires a separately reviewed product release.

## 6. Result semantics and evidence model

Do not collapse every dimension into a green or red badge. Preserve result, evidence level, environment, gas observations, and signing policy as separate fields.

### 6.1 Primary verdict

| Verdict | Meaning | User-facing headline |
|---|---|---|
| `PASS` | The exact call executed on the fork and required adapter invariants passed | Rehearsal succeeded |
| `BLOCKED` | Trusted observations show the selected supported exit cannot complete under the tested conditions | This exit was blocked in the test |
| `UNKNOWN` | Required evidence is missing, inconsistent, or interrupted | We could not verify this exit |
| `UNSUPPORTED` | The target, owner type, or exit lifecycle is outside reviewed coverage | This position is not supported |
| `NO_POSITION` | The selected supported vault reports zero shares for the address | No shares found in this vault |

A successful preview or `eth_call` alone cannot produce a full-rehearsal `PASS`. A positive balance with zero current exit allowance can be `BLOCKED`; a timeout while reading that allowance is `UNKNOWN`.

### 6.2 Orthogonal fields

| Field | Allowed values or meaning |
|---|---|
| `evidenceLevel` | `READS_ONLY`, `CALL_PREFLIGHT`, `FORK_EXECUTED`, `TESTNET_MINED` |
| `environment` | `MAINNET_READ`, `MAINNET_FORK`, `TESTNET`, `LOCAL_FIXTURE`, `RECORDED_REPLAY` |
| `gasAssessment` | `SUFFICIENT`, `INSUFFICIENT`, `UNKNOWN`, `NOT_CHECKED` |
| `signingPolicy` | `DISABLED_MAINNET`, `DISABLED_WATCH_ONLY`, `TEST_DEPLOYMENT_ONLY` |
| `sourceBlock` | Source chain, number, hash, timestamp, and observation time |
| `executionContext` | Fork chain ID and synthetic execution block, or actual testnet receipt |
| `adjustments` | Every permitted synthetic state adjustment, including native gas top-ups |
| `freshness` | Historical evidence age; never a guarantee that state remains unchanged |

When gas is added in a fork, report: **“Contract execution succeeded with simulated gas funding. The original wallet gas balance was insufficient or unverified.”** Do not present this as ready-to-send.

A server-produced report is evidence about a test, not an independently verified blockchain proof. Two RPC providers reduce some single-provider risks but do not establish trustless correctness.

## 7. Functional behavior and boundary cases

### 7.1 Address and vault selection

Accept hexadecimal Ethereum addresses only in P0. Validate length, encoding, and checksum where supplied. Reject the zero address. Do not resolve names through an additional service. Normalize for storage and show checksummed addresses for review.

The user selects from the versioned registry. A scan means “checked these supported vaults,” never “checked your entire wallet.” No position found must not imply the user has no other assets.

Inspecting another public address is allowed. Rehearsal using a fork impersonation does not prove the visitor can sign for that address. Owners with nonempty account code are unsupported for execution rehearsal in v0, including delegated-code accounts; do not mislabel all of them as conventional contract wallets.

### 7.2 Amount selection

P0 redeems shares, not a requested fiat amount. Provide 25%, 50%, and maximum-share shortcuts plus an exact custom share input. Resolve shortcuts into an explicit integer share amount before creating the plan.

The interface shows “Shares to redeem” and “Estimated underlying assets,” with separate units. Use arbitrary-precision integers for raw values. Decimal input exceeding token precision is rejected rather than silently rounded. Zero and negative amounts are invalid.

An amount above a verified current limit is rejected with the observed maximum. Changing amount, owner, chain, target, adapter version, or operation invalidates all previous preflight results.

### 7.3 Error explanations

Explain only what is established. An observed zero redemption limit can justify “The vault reports no shares redeemable now.” It does not justify “The protocol was hacked,” “The funds are gone,” or “The administrator paused it” unless that specific cause was independently observed.

Map known adapter errors to reviewed explanations. Unknown revert data is displayed as “The transaction reverted; the reason was not recognized,” with raw evidence available. Provider failures remain operational errors, not contract findings.

## 8. Rehearsal algorithm and correctness requirements

ERC-4626 separates share/asset conversions, previews, limits, and execution. Preview functions must not be treated as proof that an exit is permitted. The implementation uses reviewed interface behavior, then tests the actual operation. [S04, S08]

### 8.1 Source snapshot

Select a concrete latest source block `B`, then record its number, hash, and timestamp. Read all position and contract identity data against `B`, not a mixture of moving `latest` responses. Read-only source observations are not described as finalized.

Before publishing a result, check that `B` is still canonical at its number. If the hash changed, stop with `UNKNOWN: SOURCE_BLOCK_CHANGED` and offer a new drill. Retain the old evidence without treating it as current.

The configured secondary RPC must agree on the block hash for a complete mainnet rehearsal result. Disagreement or missing verification downgrades the result to `UNKNOWN`. Compare the critical observed values as part of adapter validation; agreement is a consistency check, not cryptographic proof.

### 8.2 Deterministic plan

Read the supported share balance, asset metadata, limits, relevant preview, target code, and original native-token balance. Build exactly one direct call:

```text
method: redeem
arguments: [sharesRaw, owner, owner]
transaction.from: owner
transaction.to: reviewed vault address
transaction.value: 0
```

For this workflow, `sender = owner = receiver`. No allowance, permit, intermediary, arbitrary receiver, or recovery wallet is introduced. SavingsDai's source checks allowances when the caller differs from the owner, which supports selecting the direct-owner path rather than adding an approval flow. [S06]

Require the requested shares to be positive, within the observed balance, and within the reviewed current redemption limit. Store the complete plan and its digest before execution. The client and server must independently derive the same target and calldata from the registry and plan fields.

### 8.3 Isolated execution

Start a fresh Anvil process at the pinned source block. Anvil supports forked state, impersonation, and transaction tracing; these are test capabilities, not authority over the real wallet. [S09]

Use an isolated execution chain ID of 31337 and preserve `sourceChainId = 1` separately. The adapter gate must establish that this chain-context difference does not change the supported redemption path. Record synthetic execution block and timestamp, because time-sensitive accrual can differ from the source snapshot.

Permit impersonation only inside that private fork. Never ask for, import, or generate a user mainnet signing key. Native balance may be raised solely to isolate contract behavior from gas affordability, and the original balance and adjustment must be recorded.

Assess gas affordability against the original native balance using a documented gas-limit buffer and fee estimate. Compare integer quantities, include the zero transaction value, and mark the assessment unknown when a required estimate is unavailable. Report this separately from contract execution.

Do not patch vault storage, share balances, asset balances, approvals, roles, withdrawal limits, or pause state in a real-position rehearsal. Synthetic test fixtures are a different environment and must remain visibly labeled.

### 8.4 Required observations

Capture owner share balance and receiver underlying-asset balance before execution. Execute the exact stored plan. Record receipt status, gas used, relevant withdrawal event, and the same balances afterward.

For the first adapter, require that shares decrease by the requested amount and that the underlying asset increase matches the adapter's observed withdrawal event. Validate the event's sender, receiver, and owner. Check the adapter-specific supply change where applicable.

Do not require a historical preview to exactly match a later synthetic execution where accrual changed. Record estimated and observed values separately, and validate the supported adapter's documented relationship. Generic arbitrary-vault assumptions are prohibited.

A missing receipt, inconsistent event, or failed balance observation produces `UNKNOWN`, not success based solely on transaction status. Full call-tree visualization is P1; the P0 evidence must still be real and sufficient for its stated invariants.

### 8.5 Freshness and economic limits

All receipts describe a past execution context. A fresh local preflight is required before any testnet wallet request. A 30-second UI freshness window is a proposed stale-data guard, not a promise that state cannot change inside that window.

The basic direct `redeem` interface does not provide an extra minimum-output parameter. ExitDrill must not invent an atomic slippage guarantee. Show output as an estimate until observed in a receipt; v0 does not enable mainnet broadcasting. [S04, S08]

## 9. Standalone recovery kit

### 9.1 Deliverable contents

The exported ZIP contains a prebuilt interface, a small Node launcher, a frozen adapter/registry snapshot, a plan and report, file checksums, license notices, and plain-language instructions. These are product requirements, not files already implemented by this PRD.

```text
exitdrill-kit/
  START_HERE.md
  start.mjs
  public/
    index.html
    assets/app.js
    assets/app.css
  data/
    manifest.json
    registry.json
    plan.json
    receipt.json
    report.html
  SHA256SUMS
  THIRD_PARTY_NOTICES.txt
```

Do not include node_modules or require an install during an incident. Ship prebuilt assets. The launcher uses Node's built-in modules, binds only to loopback, and serves the saved interface. Node, a supported browser, and a working wallet must already be available; disclose these prerequisites before export.

### 9.2 Independent behavior

The kit can open old evidence without network access. Current inspection and preflight need an RPC connection. Signing needs a compatible injected wallet and its own chain access. No claim of fully offline withdrawal is allowed.

A hosted full-fork rehearsal and a local `eth_call` preflight are different evidence levels. The kit's P0 recheck does not silently pretend to recreate the hosted fork. Full local fork rehearsal is P1.

Use an RPC endpoint configured locally by the user, never an API key copied from the hosted service. A loopback read-only proxy can avoid browser CORS limitations. It must reject transaction-submission and impersonation methods. All signing goes through the selected wallet, never the proxy.

### 9.3 Integrity and trust

Include checksums for accidental-corruption detection and publish a release checksum separately. An in-ZIP checksum file alone does not prove authenticity: an attacker could replace both code and checksums.

The UI distinguishes “files match this checksum list” from “publisher provenance verified.” P0 recommends keeping a separately obtained trusted release fingerprint and a known-good copy before an outage. Independently signed releases are P1. Do not display “cryptographically safe” or an audit badge.

Imported plans are treated as untrusted data. Reconstruct calldata from reviewed code and validated fields instead of blindly forwarding saved transaction bytes. Missing or changed contract identity blocks action.

### 9.4 Local launch and signing flow

Launch with `node start.mjs`. Configure the RPC locally without putting credentials in a URL, log, export, or command-line argument. Keep endpoint credentials in launcher memory by default; persisted configuration requires an explicit local save action and a storage warning.

The launcher enforces exact loopback Host and Origin checks plus a per-launch anti-CSRF token. Do not expose a general-purpose fetch proxy. Permit a configured public HTTPS RPC destination; allow a local RPC only in an explicit local-fixture mode. Disable redirects and validate resolved destinations to limit SSRF and rebinding paths.

The local interface rebuilds the plan, verifies network and contract identity, checks current limits, and performs a fresh call preflight. Viem's contract simulation uses a read-only call, returns data or reverts, and does not itself modify blockchain state. [S10]

Only after every test-deployment guard passes may the user press **Review test withdrawal** and confirm in their wallet. Account or chain changes invalidate the review. Mainnet contexts show **Mainnet broadcasting is disabled in this release**, with no hidden override.

## 10. Initial integration and fixture contracts

### 10.1 Real integration target

| Item | Decision |
|---|---|
| Protocol target | Savings DAI, sDAI |
| Source network | Ethereum mainnet |
| Published target address | `0x83f20f44975d03b1b09e64809b757c47f942beea` [S05] |
| Operation | Direct-owner redemption |
| Current status | Candidate chosen; on-chain behavior and application integration still require validation |
| Public action policy | Read-only and fork rehearsal; no mainnet broadcast |

The registry must include the reviewed underlying asset address, decimals, runtime code identity, dependency checks, ABI digest, adapter version, source references, and validation block. Obtain and verify these during integration; do not populate invented hashes, testnet deployments, or successful receipts.

A holder used in the real fork demonstration must have an actual positive position at the pinned block. The report must state that using a public address is hypothetical execution, not proof of ownership. Do not manufacture the real-position demo by altering token balances. If the integration cannot pass, disclose that release gap instead of relabeling a fixture as mainnet evidence.

### 10.2 Enablement gates

Before marking the adapter enabled, verify published deployment identity against live bytecode and reviewed source; confirm the underlying token and dependency identities; pin a reproducible block and positive-position example; exercise a genuine redemption on a fork; check native-gas handling; validate decimal arithmetic and accrual behavior; and repeat using a second RPC provider.

The first adapter rejects unreviewed proxy behavior. Adding a proxy later requires implementation identity checks, not merely matching the proxy's outer bytecode. Dependencies can also change behavior even when the top-level code does not, so every report remains time-bound.

### 10.3 Controlled fixtures

Use a small OpenZeppelin-based ERC-4626 test vault and a test asset. OpenZeppelin documents the standard vault implementation and extension behavior. Fixture modifications remain test-only. [S11]

Required fixture configurations are: normal redemption; zero allowed redemption; a smaller positive share limit; and a known deterministic revert. A restriction must be enforced by execution as well as reflected in limit reads. A fake cap that only changes a displayed limit is insufficient.

Deploy fixtures locally first. A public test deployment is optional if local signing covers the end-to-end demonstration; when used, Sepolia is the chosen test network. Ethereum documentation identifies Sepolia for application testing. Use a dedicated test wallet rather than a mainnet account. [S16] Generate its addresses and code hashes from deployment artifacts. Test-asset minting and deposits belong in the setup flow, not in a request for user mainnet funds.

# Part II. Embedded design.md

## 11. Design direction

### 11.1 Visual concept: the exit field manual

The interface should feel like a calm, precise diagnostic instrument. Use a warm light canvas, dark ink, restrained green emphasis, thin structural rules, and monospaced evidence. Avoid a trading dashboard aesthetic.

The product's visual centerpiece is a dependency strip: **Saved kit → wallet → RPC → contract**. Hosted websites appear separately as dependencies the tested path does not require. Label the strip as the tested path, not an exhaustive map of all protocol or infrastructure dependencies.

Do not use neon gradients, glass panels, floating coins, fake price charts, animated safety scores, a permanent chatbot sidebar, or a wall of generic cards. A simple typographic wordmark is sufficient for P0; no logo-generation dependency is required.

### 11.2 Information hierarchy

Every result view answers, in order: what happened, what was tested, what remains required, what the next action is, and where the evidence can be inspected.

Show the result sentence before the technical trace. Always place network, environment, and evidence age beside the result. Keep estimated assets distinct from observed assets. Show token quantities rather than a fabricated dollar valuation.

## 12. Design tokens and component system

### 12.1 Color tokens

These are proposed interface tokens. Validate actual foreground/background combinations during implementation rather than assuming every combination passes contrast.

| Token | Value | Use |
|---|---|---|
| `canvas` | `#F7F8F4` | Main background |
| `surface` | `#FFFFFF` | Forms and evidence panels |
| `ink` | `#17251F` | Primary text |
| `muted` | `#53645B` | Supporting text |
| `border` | `#D6DED7` | Separators |
| `action` | `#185B43` | Primary action with white text |
| `positive` | `#176345` | Verified positive observation |
| `warning` | `#805600` | Uncertainty, age, and unmet requirements |
| `negative` | `#A32D35` | Verified blocked action or destructive UI |
| `focus` | `#245BDB` | Keyboard focus outline |

Status must always include text and an icon. Color never carries the only meaning. Recorded replay uses an explicit REPLAY label, not merely a different background.

### 12.2 Typography, spacing, and shape

Use the system sans-serif stack for runtime independence. A designer may use Inter while composing screens, but the shipped interface must not fetch a font. Use the system monospace stack for addresses, amounts, and receipts.

| Element | Desktop | Small screen |
|---|---|---|
| Page title | 36px / 42px, weight 650 | 28px / 34px |
| Section title | 24px / 30px, weight 600 | 22px / 28px |
| Body | 16px / 24px | 16px / 24px |
| Supporting text | 14px / 21px | 14px / 21px |
| Evidence text | 13px / 20px, monospace | 13px / 20px |

Spacing scale: 4, 8, 12, 16, 24, 32, 48, and 64px. Use 8px control radii and 12px panel radii. Prefer borders to shadows; reserve a subtle shadow for modal layers. Inputs and buttons have a minimum 44px interaction height.

### 12.3 Layout and responsiveness

At desktop widths, use a maximum 1280px content region with 32px outer gutters, a 12-column grid, and 24px gaps. The drill view uses approximately two-thirds for the primary workflow and one-third for a sticky evidence summary.

Below 1024px, move the summary below the primary result. Below 640px, use 16px gutters and a single column. Never create whole-page horizontal scrolling. Evidence can scroll within a labeled region. Long addresses wrap or expose a dedicated full-address view; the final review must not hide the receiver behind truncation.

### 12.4 Required components

| Component | Important variants or behavior |
|---|---|
| `EnvironmentBadge` | Mainnet read-only, mainnet fork, local fixture, testnet, replay |
| `OutcomeBanner` | Pass, blocked, unknown, unsupported, no position |
| `AddressField` | Idle, invalid, valid, read-only; copy confirmation |
| `TokenAmount` | Raw and formatted values; estimated or observed label |
| `ShareAmountInput` | Precision error, above-limit error, percentage shortcuts |
| `StepLedger` | Pending, running, passed, blocked, unknown; real events only |
| `EvidenceDrawer` | Block, plan, calls, balances, receipt, adjustments |
| `DependencyStrip` | Tested requirement, available, unavailable, not used |
| `ContractIdentityRow` | Reviewed, changed, unknown; source details |
| `TransactionReview` | Full recipient, chain, target, selector, amount, estimated gas |
| `KitReadinessPanel` | Downloaded, integrity checked, current preflight needed |
| `ConnectionBanner` | Provider disconnected, wrong chain, RPC unavailable |

Use semantic HTML and accessible primitives. A component library is a starting point, not a substitute for these states and hierarchy.

## 13. Screen-by-screen specification

### 13.1 Landing and demo entry: `/`

Lead with **“Test your way out before you need it.”** Supporting copy: “Rehearse a supported vault withdrawal and keep a recovery kit that does not need the original website.” Put the v0 mainnet read-only limitation immediately underneath, not inside a footer.

Primary action: **Inspect a position**. Secondary action: **Open a recorded demo**. The demo action must lead to a visibly labeled recorded fixture or recorded fork receipt, never something presented as a fresh live check.

Below the entry, show the four-step journey, the actual enabled integration, and three limitations: no lost-key recovery, no bypass of contract restrictions, and no guarantee that a rehearsal predicts future execution. Omit unsupported protocol logos and fabricated usage metrics.

### 13.2 Inspect: `/inspect`

The form contains an address field and an enabled-vault selector. Network is derived from the selected registry entry rather than an unrestricted chain picker. Explain that inspection is read-only and that submitting an address reveals the lookup to ExitDrill's server and its RPC providers.

A successful inspection presents share balance, underlying asset, observed current limit, source block and age, reviewed contract identity, and original native-token balance where available. The share input follows underneath. Primary action: **Run exit rehearsal**.

For zero shares, show “No shares found in this supported vault” and keep the address editable. For unsupported owner code, allow the evidence to be read but disable rehearsal and explain coverage. For a provider failure, retain the input and show an actionable retry without clearing the user's work.

### 13.3 Drill and result: `/drills/:id`

The top line shows the environment badge, source chain, shortened block hash, and drill ID. The main column has the real-time step ledger: verify identity, read position, build plan, prepare fork, execute, check outcomes. Derive every transition from persisted events. Do not animate fake progress percentages.

On completion, the result headline replaces the running summary. Display requested shares, estimated asset output, observed asset output where available, and outstanding requirements. A highlighted result sentence must remain readable without opening the evidence drawer.

The evidence summary contains the exact operation, owner/receiver, target, evidence level, gas adjustment warning, and timestamp. Primary action after a completed report: **Export recovery kit**. Secondary action: **Inspect evidence**. A blocked or unknown report may still be exported, clearly labeled as a diagnostic record rather than a verified exit plan.

### 13.4 Evidence drawer

Use tabs or anchored sections for Summary, Transaction, Balances, Receipt, and Assumptions. Do not render enormous raw JSON by default. Provide explicit copy and download actions.

Compare raw and human-readable amounts. Distinguish estimated gas from observed gas used. Never turn native gas top-ups into an invisible implementation detail. Explain that a fork transaction hash is not a mainnet transaction and do not link it to a mainnet explorer as though it were one.

### 13.5 Export review

Show exactly what will be included and what will not. Included: the public wallet address, contract details, historical observations, plan, local interface, and instructions. Excluded: private keys, RPC credentials, session cookies, and server secrets.

Explain local prerequisites and the difference between an offline-readable report and an online current-state check. Acknowledge that the exported report associates a wallet with a specific exit intention. Users choose whether to save or share it.

Use a positive, non-urgent action label: **Save recovery kit**. No countdown, fear-based message, or pressure to transact is allowed.

### 13.6 Local recovery interface

The local header reads **“ExitDrill local kit”** and includes kit version and provenance state. A persistent banner states **“Hosted services are not required. A wallet and RPC connection still are.”**

The workflow is Verify kit, Configure connection, Recheck position, Review plan, and Test withdrawal. Old evidence begins collapsed under a label that includes its timestamp. A fresh preflight is displayed separately rather than replacing or rewriting the old fork receipt.

Only allowlisted test deployments expose a signing action. Mainnet plans can be inspected and rebuilt but remain read-only. User rejection returns to review; ambiguous submission enters a dedicated reconciliation view rather than showing a retry-payment button.

### 13.7 State coverage matrix

| Surface | Empty or initial | Loading | Failure or uncertainty | Completed |
|---|---|---|---|---|
| Inspector | Address and supported target form | Named contract reads | Unsupported target, no position, RPC unknown | Snapshot with provenance |
| Drill | Queued request | Actual step ledger | Blocked, timed out, evidence mismatch | Result and export action |
| Evidence | No observation yet | Per-section loading | Missing field remains unknown | Raw and formatted evidence |
| Export | Prerequisite explanation | Packaging status | Retry packaging, not rehearsal | File saved acknowledgement |
| Local kit | Historical report only | Current recheck | RPC unavailable, identity changed | Current preflight result |
| Wallet review | Explicit connect action | Wallet confirmation requested | Rejected, changed chain, ambiguous outcome | Testnet receipt with observed result |

## 14. Interaction, accessibility, and content rules

Target WCAG 2.2 AA and verify applicable criteria rather than claiming certification. Required checks include keyboard operation, visible focus, contrast, meaningful labels, non-color status indicators, and usable reflow. The 44px control target is an additional product choice, not a statement that every AA control must be exactly that size. [S14]

Use a skip link, sensible heading hierarchy, and `aria-live="polite"` for stage transitions. Announce completed steps rather than every polling response. A drawer traps focus only while modal and restores focus on close. Do not auto-open a wallet because a page loaded.

Support reduced motion. Ordinary transitions may last 120 to 180ms; status content must not depend on animation. Avoid confetti after withdrawals. Preserve context after a form error and show validation beside the affected input.

Use “rehearsed,” “observed,” “estimated,” and “could not verify” precisely. Never use “100% safe,” “guaranteed exit,” “funds rescued” for a simulation, or “offline withdrawal.” Display technical terms with short explanations rather than hiding essential limitations in tooltips.

# Part III. Backend and implementation design

## 15. Proposed stack and repository layout

Use an all-TypeScript application layer to share transaction planning, validation, and result semantics. Solidity is limited to fixture contracts and adapter tests. Exact dependency versions are selected and pinned at implementation bootstrap; this document does not invent future package versions.

| Layer | Proposed choice | Reason |
|---|---|---|
| Hosted interface | Next.js, React, TypeScript | Familiar component workflow and routed product screens |
| Standalone interface | Vite-built React bundle | Prebuilt static output independent of the hosted server |
| Styling | Tailwind CSS with accessible component primitives | Apply the explicit design system consistently |
| Chain interaction | Viem | Typed reads, deterministic encoding, and call preflight |
| API | Fastify on Node | Small explicit API and session boundary |
| Rehearsal worker | Node supervising private Anvil processes | Real fork execution without live-wallet keys |
| Local persistence | SQLite in WAL mode on a single host | Durable jobs without a distributed database dependency |
| Test contracts | Foundry and OpenZeppelin test fixtures | Repeatable contract behavior and integration checks |
| Application testing | Vitest, Playwright, and an accessibility checker | Unit, end-to-end, and UI validation |

Next.js documents self-hosting, while Vite documents production builds suitable for static deployment. Those capabilities support the proposed hosted/local split; they do not establish this application's runtime independence, which must be tested. [S17, S18]

This is a proposed architecture, not a claim that these tools provide the entire security model automatically. Avoid Redis, Kubernetes, a message broker, multi-agent orchestration, and a hosted database unless a measured need appears.

```text
apps/
  web/                 hosted product interface
  api/                 sessions, inspections, jobs, receipts, exports
  worker/              isolated fork lifecycle and observations
  kit/                 standalone interface and Node launcher
packages/
  domain/              states, error taxonomy, quantities, schemas
  adapters/            reviewed registry and deterministic planning
  chain/               read clients and source-block consistency
  evidence/            receipt assembly, digests, and rendering
  ui/                  shared accessible presentation components
contracts/
  fixtures/            test asset and controlled ERC-4626 vaults
  test/                fixture and real-adapter fork tests
registry/              versioned, validated deployment manifests
scripts/               setup, fixture deployment, and release checks
tests/
  e2e/                 hosted and standalone user journeys
  security/            signing interception and isolation tests
  fixtures/            explicitly labeled recorded evidence
docs/                   this specification and operating instructions
```

The standalone bundle may import domain, adapter, chain, and UI code. It must not import API clients that are required to reach ExitDrill hosting.

## 16. Architecture and trust boundaries

### 16.1 Hosted flow

The browser submits an address and registered vault identifier to the same-origin API. The API validates the request, obtains a source snapshot, and stores an inspection. When the user requests a drill, the API writes a durable job. The worker claims the job, creates a private fork, executes the deterministic plan, records observations, and stores an immutable receipt. The browser polls the job and offers an export.

The worker's access to testing methods is not exposed to the browser. Upstream RPC access is read-only. A reverse proxy serves the web application and `/v1` API through one origin, reducing cross-origin session complexity.

### 16.2 Standalone flow

The local interface loads prebuilt assets and saved evidence. The launcher provides a narrowly restricted read-only RPC connection. The browser reconstructs a plan locally and checks current state. An injected wallet is used only for explicit test-deployment signing.

There is no call from the standalone critical path to the hosted API, worker, analytics, protocol website, external font service, or LLM. The wallet and chosen RPC may have their own infrastructure dependencies, which remain outside ExitDrill's independence claim.

### 16.3 Trust boundary table

| Boundary | Rule |
|---|---|
| Browser to API | Validate all inputs; session-scoped reads and writes; origin and size controls |
| API to registry | Only reviewed, immutable manifest versions select targets and ABIs |
| Worker to fork | Private process and RPC endpoint; one job's mutable state cannot reach another |
| Worker to upstream | Read-only method allowlist; never forward fork control or send methods |
| Browser to wallet | User-driven, decoded test transaction only; no arbitrary signing payloads |
| Local kit to saved data | Parse as untrusted data and reconstruct actions from reviewed code |
| RPC to observations | Validate network, block consistency, values, and code identity; retain trust limitations |
| Optional AI to application | Text explanation only; no authority to alter plans or verdicts |

## 17. Domain contracts and persisted data

### 17.1 Required schema conventions

Use decimal strings for integer quantities in JSON and SQLite, and `bigint` in runtime arithmetic. Do not serialize token amounts through JavaScript floating-point numbers. Distinguish addresses, transaction hashes, block hashes, and generic strings with runtime validation.

All server timestamps are UTC ISO 8601. Product screens may render IST or the user's local time while exposing the absolute timestamp. Store both chain timestamp and observation timestamp.

```typescript
type Verdict =
  | 'PASS' | 'BLOCKED' | 'UNKNOWN'
  | 'UNSUPPORTED' | 'NO_POSITION';

type EvidenceLevel =
  | 'READS_ONLY' | 'CALL_PREFLIGHT'
  | 'FORK_EXECUTED' | 'TESTNET_MINED';

interface ExitPlan {
  schemaVersion: 1;
  adapterId: string;
  adapterVersion: string;
  registryDigest: string;
  sourceChainId: number;
  sourceBlockNumber: string;
  sourceBlockHash: string;
  owner: string;
  receiver: string;          // must equal owner in v0
  target: string;            // derived from reviewed registry
  operation: 'redeem';
  sharesRaw: string;         // positive base-10 integer
  valueRaw: '0';
  calldata: string;          // derived, never trusted input
  planDigest: string;
}

interface Observation {
  id: string;
  stage: string;
  check: string;
  result: 'PASS' | 'FAIL' | 'UNKNOWN';
  blockNumber?: string;
  rawValue?: string;
  reasonCode?: string;
  observedAt: string;
}
```

The digest uses a documented canonical field order and normalized encodings. Exclude the digest field itself. Use one reviewed implementation in both hosted and local code. A digest detects differences; it does not authenticate an untrusted publisher.

### 17.2 Minimum persisted entities

| Entity | Required fields and constraints |
|---|---|
| `sessions` | ID, hashed random session credential, created/expiry timestamps; no wallet signature |
| `inspections` | ID, session ID, registry digest, owner, target, source block identity, normalized observations, expiry |
| `drill_jobs` | ID, session ID, inspection ID, normalized request hash, idempotency key, status, attempt, lease, timestamps |
| `drill_events` | Job ID, monotonically increasing sequence, stage, timestamp, structured redacted payload |
| `receipts` | Job ID unique, verdict, evidence level, plan, adjustments, source/execution contexts, observations, artifact digest |
| `export_events` | Session ID, receipt ID, kit version, timestamp; do not retain extra copies of ZIPs by default |

Enable foreign keys and use transactions for job claiming and terminal result publication. A completed receipt is immutable. A new rehearsal creates a new receipt; it does not overwrite inconvenient historical results.

### 17.3 Receipt contents

Every receipt contains the normalized plan, source block, adapter/registry version, actual environment, execution context, relevant contract identities, pre/post balances, receipt fields, gas observations, synthetic adjustments, checks, errors, and limitations. Include source mode and whether the record is live-generated or recorded replay.

For interrupted runs, publish a partial receipt with an unknown verdict. Missing quantities remain null or absent with a reason, never zero by default. Do not infer an unobserved balance from a formatted display value.

## 18. API contracts

### 18.1 Session and privacy model

Use anonymous, short-lived server sessions. Generate a high-entropy session credential and store only its hash. Deliver the cookie with HttpOnly, Secure, and SameSite=Strict in the hosted deployment. Require same-origin requests and validate Origin on mutations. No social login or wallet-message signing is necessary.

Every inspection, job, receipt, and export belongs to the requesting session. An unguessable job ID is not authorization. Do not enable public report sharing in P0.

### 18.2 Endpoints

| Method and path | Input | Output and behavior |
|---|---|---|
| `POST /v1/session` | None | Establish anonymous session and expiry |
| `GET /v1/registry` | None | Enabled entries with versions, capabilities, and public source references |
| `POST /v1/inspections` | `owner`, `vaultId` | Snapshot ID, source block, observations, supported amount information |
| `POST /v1/drills` | `inspectionId`, `sharesRaw`; idempotency header | `202` with job ID and initial status |
| `GET /v1/drills/:id` | Session authorization | State, ordered events, and completed-result summary |
| `GET /v1/drills/:id/receipt` | Session authorization | Immutable complete or partial receipt |
| `POST /v1/drills/:id/kit` | Session authorization | Versioned ZIP assembled from immutable receipt and prebuilt kit assets |
| `DELETE /v1/session` | Current session | Delete owned persisted records and invalidate the session |
| `GET /health/live` | None | Process health without provider credentials |
| `GET /health/ready` | Internal or restricted | Registry, database, worker, and RPC readiness |

The API never accepts a caller-supplied ABI, arbitrary calldata, arbitrary receiver, fork URL, shell argument, or contract deployment. It never exposes a sign or broadcast endpoint.

### 18.3 Validation and errors

Limit request bodies to 16 KiB. Use allowlisted fields and strict schemas. An inspection older than 60 seconds cannot create a new drill without a fresh inspection; this is a product guard, not an atomic state guarantee. A queued drill still identifies and tests its pinned historical block explicitly.

| Status | Meaning |
|---|---|
| `400` | Malformed or invalid input |
| `401` | Missing or expired session |
| `403` | Resource not owned by this session |
| `409` | Idempotency key reused with different input or incompatible state |
| `410` | An owned record has expired |
| `422` | Valid request outside supported product coverage |
| `429` | Session or service capacity limit reached |
| `503` | Required infrastructure unavailable |

A completed drill that finds a contract blocker is a successful API operation with a `BLOCKED` product verdict, not an HTTP server error.

Every error returns `code`, a safe human-readable `message`, `retryable`, and `requestId`. Never put raw provider credentials, internal file paths, or unfiltered upstream responses into that message.

### 18.4 Idempotency

The same session, idempotency key, and normalized request return the existing job. Reusing the key for a different request returns `409`. A retry does not silently change amount or source block.

Kit export is repeatable without executing another drill. For the same receipt and kit release, normalize file ordering and archive metadata so packaging is reproducible. Dynamic session secrets are never part of the archive.

## 19. State machines and reconciliation

### 19.1 Rehearsal lifecycle

```text
QUEUED -> VALIDATING -> PREPARING_FORK -> EXECUTING
       -> VERIFYING -> COMPLETED

Terminal alternatives: UNSUPPORTED, CANCELLED, FAILED_UNKNOWN
```

Every terminal job produces a complete or partial receipt, including unsupported and interrupted outcomes. `COMPLETED` contains a product verdict such as `PASS`, `BLOCKED`, or `NO_POSITION`; operational lifecycle and product verdict are separate. A validation-stage limit failure can complete a blocked receipt without pretending execution occurred. Its evidence level remains `READS_ONLY`.

Before publishing a fork-execution pass, require receipt and invariants. A worker failure during execution becomes unknown unless the job's private fork and stored evidence can be safely reconciled. Do not label it blocked because a process died.

### 19.2 Worker leases and retries

A worker atomically leases a queued job. Persist heartbeat and current stage. If a lease expires, mark the attempt interrupted. A bounded retry may use a fresh isolated fork because it cannot duplicate a mainnet action, but retain the interrupted attempt and exact original plan.

Allow at most one automatic retry for a transient setup or read error. Do not repeatedly retry a deterministic contract revert. Apply per-stage timeouts and a 90-second total run limit; a timeout produces an honest unknown outcome. These limits are operational defaults to tune after measurement.

P0 uses polling, not a streaming dependency. Poll approximately once per second while active, back off on transport failure, and stop on a terminal state. Server state, not the animation, is authoritative.

### 19.3 Test transaction lifecycle

```text
DRAFT -> PREFLIGHTED -> AWAITING_WALLET -> SUBMITTED
      -> INCLUDED -> VERIFIED

Alternatives: USER_REJECTED, REVERTED, OUTCOME_UNKNOWN,
              REPLACED_OR_CANCELLED
```

Immediately before wallet submission, recheck account, chain, contract identity, amount, receiver, current limit, and preflight age. EIP-1193 defines account/chain change events and distinguishes rejection from connectivity errors; handle these separately. [S12]

Persist the known hash and sender/nonce context locally once available. If the wallet or network times out after submission may have occurred, do not resend automatically. Recover by checking the wallet and receipt, recognizing a replacement where supported. With no hash and uncertain broadcast, keep the result unknown and instruct the user to inspect wallet activity.

A receipt with failed status is not a completed withdrawal. A successful receipt without the required observed outcome remains pending verification or unknown. Show inclusion confirmations without claiming irreversible finality after one block.

## 20. Security, privacy, and financial-action controls

### 20.1 Threat model

| Threat | Required control | Residual limit |
|---|---|---|
| Malicious recipient or calldata | Derive locally from registry and fixed owner/receiver invariant | A compromised client build still requires a trusted distribution path |
| Wrong network | Verify chain ID in data source and wallet; invalidate on changes | An RPC can lie; consistency checks are not consensus verification |
| Changed contract behavior | Code and dependency identity checks plus fresh preflight | Unchanged code can still depend on changed state |
| Fork RPC exposed publicly | Loopback or private network only; authenticated worker boundary | Host compromise remains outside the trust model |
| False confidence from gas funding | Record original balance and every synthetic adjustment | Future gas requirements can change |
| Secret leakage in exports | Allowlist archive contents and scan built output | Users can separately disclose files themselves |
| Tampered kit | Known-good release fingerprint, checksums, deterministic build process | Self-contained hashes alone cannot prove authenticity |
| XSS through metadata or errors | Escape text, limit content, strict CSP, no HTML rendering of untrusted strings | Browser or extension compromise remains possible |
| Duplicate test withdrawal | Explicit intent state, no automatic resend, reconciliation | External wallet behavior is not fully controlled |
| Denial of service | Session limits, bounded concurrency, timeouts, and resource quotas | Public infrastructure can still become unavailable |

### 20.2 Browser and local controls

Enforce a Content Security Policy that does not permit arbitrary scripts or `eval`. Escape token metadata, revert strings, and imported labels. Do not treat a policy header as a complete XSS defense; output handling and other controls remain necessary. [S15]

Use EIP-6963 provider discovery so the user deliberately selects an injected wallet. Do not trust a provider icon as executable content, and never automatically choose a wallet merely because it was injected last. Provider discovery is a compatibility mechanism, not an authenticity guarantee. [S13]

Do not use wallet signing as a login action. Do not request token allowances. Mainnet send and signature methods must be denied before they reach a wallet provider, even if a UI button is accidentally exposed.

### 20.3 Worker controls

Run the worker unprivileged. Do not expose a Docker socket or accept arbitrary shell commands. Spawn Anvil with explicit argument arrays, a validated binary, fixed resource limits, and no user-controlled network endpoints. Kill processes and remove temporary data after every job.

Restrict upstream JSON-RPC methods to the reads needed for forking and observation. Verify that `eth_sendRawTransaction`, `eth_sendTransaction`, and `anvil_*` calls cannot reach the live upstream provider. Keep test-control methods inside the private fork.

Separate synthetic local signing from a real-state fork. A user must not connect a wallet to the worker's impersonation endpoint. Do not distribute or reuse publicly known development keys for real assets.

### 20.4 Privacy and retention

Wallet addresses are public on-chain but a user's visit, association, and exit plan can still be sensitive. Disclose the server and RPC lookup before inspection. Never send addresses or full receipts to an LLM by default.

Default server retention is 24 hours for anonymous sessions and their evidence. Apply cascade deletion on expiry and on explicit session deletion. Do not retain evidence-bearing database backups in P0; operators must disclose any later backup retention change. Restrict file permissions and avoid claiming encryption-at-rest beyond what is actually configured.

Operational logs contain request/job IDs, stages, timings, and reason codes, not full addresses, calldata, credentials, or user-agent fingerprints. Do not add advertising analytics, session replay, or a third-party tracking pixel. Exported files are under the user's control and cannot be remotely deleted by ExitDrill.

## 21. Optional explanation assistant

P0 ships without an LLM requirement. The deterministic report must already be readable.

A later explanation feature may receive a minimized set of approved findings and produce plain-language text linked to observation IDs. It cannot choose a vault, change an amount or receiver, construct calldata, request a signature, classify a previously unknown error as a verified cause, or override the verdict.

Treat contract metadata and error strings as untrusted input. Use a strict output schema and reject explanations containing unsupported causes or actions. If the model is unavailable, the product still works. Model/provider selection and pricing are separate implementation decisions, not assumed dependencies.

## 22. Operations, configuration, and reliability

### 22.1 Deployment topology

For P0, deploy the web server, API, worker, and SQLite on one persistent host behind TLS, with distinct processes and private internal ports. This avoids pretending a short-lived serverless function can safely supervise long-running mutable fork jobs. The browser and API remain same-origin.

Start with one concurrent fork worker and a small bounded queue. Increase only after measuring memory and provider usage. A proposed test host is 2 vCPU and 4 GiB RAM; this is a starting configuration, not a validated capacity or price quote.

The independently exported kit must not require that host after download. A recorded demo remains available as a labeled fallback when hosted infrastructure is unavailable.

### 22.2 Configuration contract

Required values include primary and secondary source RPC URLs, enabled registry path and digest, validated Anvil binary location/version, database path, local artifact directory, retention duration, concurrency limit, job timeout, allowed origin, and supported test-deployment manifest.

RPC credentials are server-only. The local launcher uses separately supplied user configuration. Never prefix secrets as public frontend environment values. Do not write example credentials or private keys into the repository.

Startup readiness validates chain IDs, required source reads, registry completeness, contract identities at the configured validation point, executable availability, database write access, and test deployment metadata. Missing values disable the corresponding adapter with an explicit reason. The service must not start with fake success defaults.

### 22.3 Observability and degraded operation

Record stage duration, queue time, RPC error category, worker restarts, unknown verdict rate, and export errors. Separate contract blockers from infrastructure failures in metrics. A spike in unavailable RPC calls should not be reported as increased protocol risk.

Use small bounded retries with jitter for reads. Do not mix provider results from different blocks. A fallback provider must establish the same block identity. Never display a cached report as a new check without its original timestamp and environment.

Set a per-session cap of one active drill and a default global queue cap of ten. Return a clear capacity response rather than running unbounded forks. Initial limits are operational choices to validate during load testing.

# Part IV. Verification, delivery, and submission

## 23. Acceptance test matrix

The following cases are required release evidence. They are not claims that tests already pass.

| ID | Scenario | Required observable result |
|---|---|---|
| AT-01 | Inspect a valid supported public address | No wallet signature; block-pinned position reads |
| AT-02 | Inspect a zero-share address | `NO_POSITION`, scoped to the selected vault |
| AT-03 | Enter malformed, zero, or invalid-checksum address | Validation error before a worker job starts |
| AT-04 | Enter unsupported vault or owner with account code | No unreviewed execution path |
| AT-05 | Use excessive decimal precision or huge amounts | Exact validation; no floating-point loss or silent rounding |
| AT-06 | Request more shares than the verified limit | Clear maximum and no altered amount submitted silently |
| AT-07 | Rehearse a real positive position on the selected adapter | Actual private-fork receipt and balance invariants |
| AT-08 | Rehearse a paused or restricted fixture | Blocked result without changing restriction state |
| AT-09 | Preview is positive but actual call reverts | No passing verdict based on preview |
| AT-10 | Provide insufficient native gas | Original deficiency remains visible even after synthetic funding |
| AT-11 | Inject a provider timeout | `UNKNOWN`, not zero balance or blocked withdrawal |
| AT-12 | Providers disagree on source block | `UNKNOWN: SOURCE_BLOCK_MISMATCH` |
| AT-13 | Source block is replaced before publication | Old result invalidated as current evidence |
| AT-14 | Change target code or relevant identity | Adapter action blocked pending revalidation |
| AT-15 | Alter owner, receiver, or stored calldata | Reconstruction detects mismatch; no wallet request |
| AT-16 | Fail post-transaction balance observation | No full-rehearsal pass solely from receipt status |
| AT-17 | Crash worker during a job | Interrupted attempt retained; no cross-job state reuse |
| AT-18 | Reuse an idempotency key | Same request reuses job; different request returns conflict |
| AT-19 | Access another session's receipt | Access denied despite knowing its ID |
| AT-20 | Scan kit contents and built assets | No secrets, credentials, remote scripts, or hidden tracking |
| AT-21 | Corrupt a kit file | Integrity mismatch visible; no false authenticity claim |
| AT-22 | Launch kit with a fresh browser profile and services down | Local assets and saved evidence load without caches |
| AT-23 | Recheck kit with one failed RPC | Verified fallback or unknown; no silent mixed-state reads |
| AT-24 | Recheck kit with all RPCs unavailable | Old report readable, current-state result unknown |
| AT-25 | Trigger mainnet transaction or signing code directly | Request blocked before reaching the wallet provider |
| AT-26 | Sign allowlisted test withdrawal | Wallet-controlled transaction with observed test receipt |
| AT-27 | Change wallet account or chain during review | Invalidate preflight and prevent stale confirmation |
| AT-28 | Reject wallet request | Return to review without treating rejection as a contract failure |
| AT-29 | Simulate timeout after possible broadcast | No automatic resend; reconcile or remain unknown |
| AT-30 | Test keyboard, contrast, reduced motion, and narrow layout | Core journey usable without mouse or visual-only status |
| AT-31 | Expire or delete a session | Associated stored evidence inaccessible and removed |
| AT-32 | Render malicious metadata or revert text | Text is escaped; no script execution |
| AT-33 | Attempt live upstream send or fork-control method | RPC gateway rejects the method |
| AT-34 | Inspect a recorded example | Persistent replay label and original timestamp |

### 23.1 Test layers

Unit tests cover quantity parsing, plan digests, input validation, error classification, mainnet denial, and state transitions. Contract tests cover fixture enforcement and adapter-specific numerical behavior. Integration tests cover real-state forks, code identity, isolated jobs, and source consistency.

End-to-end tests exercise both the hosted product and a genuinely extracted kit. Use a wallet-provider test double for safety interception, then record a separate wallet-signed local or public-testnet demonstration. Do not confuse a mocked provider with proof that an actual wallet flow works.

A network-isolation test starts from a fresh profile, disables the hosted origin and protocol frontend, blocks all application requests except loopback and the configured RPC destinations, and verifies successful local operation. Document wallet-extension network behavior separately rather than claiming control over it.

### 23.2 Release evidence bundle

Save command outputs, dependency lockfiles, tested versions, fixture deployment manifests, source block identity, selected adapter validation, screenshots, network-isolation observations, and actual rehearsal receipts. Remove credentials and unnecessary personal details before publication.

A test count is not a substitute for these behavioral results. Do not publish an audit claim or “production ready” label on the basis of a hackathon test suite.

## 24. Delivery plan and scope controls

This is a proposed build schedule for the project owner, not a promise of autonomous future work.

| Date | Milestone | Exit condition |
|---|---|---|
| 18 September | Foundation and integration spike | Registry format, exact redemption path, first genuine fork experiment |
| 19 September | Deterministic core | Correct quantities, source snapshot, plan builder, and fixture tests |
| 20 September | Evidence pipeline | Private worker execution, observations, honest verdicts, immutable receipt |
| 21 September | Hosted workflow | Inspector, drill ledger, result, and evidence drawer connected to real API |
| 22 September | Standalone kit | Prebuilt export launches locally and performs a current preflight |
| 23 September | Test-funds execution | Wallet guards, explicit review, receipt handling, and ambiguity handling |
| 24 September | Failure and security tests | Service outage, RPC outage, changed identity, tampered plan, mainnet denial |
| 25 September | Product polish | Responsive layouts, accessibility, content, and reproducible walkthrough |
| 26 September | Submission | Public repository, deployed demo, video, presentation, and Devpost entry |
| 27 September | Buffer before 12:30 PM IST | Correct only release-blocking issues and verify submission completeness |

### 24.1 Dependency order

Complete the real adapter experiment before building an elaborate dashboard. Complete the domain model and transaction builder before adding wallet actions. Complete the standalone kit before spending time on decorative motion. Finish the honest blocked case before adding another protocol.

### 24.2 Scope cuts under pressure

Cut AI explanation first, then full trace visualization, then any second integration, then public-testnet deployment if local wallet signing already proves the journey. Keep a real fork integration, independent kit operation, visible limitations, and mainnet protection.

If a core claim fails, reduce the claim rather than fabricate evidence. A fixture-only prototype is a narrower submission and must be described as such. Do not hide missing independent-kit operation behind a pre-recorded animation.

## 25. Demo script and submission package

### 25.1 Proposed three-minute demonstration

The length below is a presentation choice; the event pages reviewed do not specify a three-minute cap.

| Segment | What happens | What the viewer learns |
|---|---|---|
| 0:00 to 0:20 | Show a supported position and its environment label | The problem is exiting without dependence on one website |
| 0:20 to 0:50 | Run or show a clearly labeled recorded real-adapter fork drill | An exact transaction was tested against recorded chain state |
| 0:50 to 1:15 | Open balances, receipt, and gas assumptions | The result has inspectable evidence and explicit limits |
| 1:15 to 1:45 | Save the kit, disable hosted services, launch the local interface | The recovery tooling does not require ExitDrill hosting |
| 1:45 to 2:20 | Switch visibly to a fixture environment and sign a test withdrawal | The local path supports an actual wallet transaction with test funds |
| 2:20 to 2:45 | Show a restricted fixture and then an RPC outage | Contract blockers and missing evidence are not confused |
| 2:45 to 3:00 | State supported scope and next step | Mainnet broadcasting is not shipped or claimed |

Do not make an actual protocol website unavailable. Simulate its absence by blocking it in the demo browser or using a separately labeled fixture frontend. Block only environments you control. Do not portray the demonstration as a real incident at the integrated protocol.

If infrastructure is unavailable during judging, use a labeled recording and provide the reproducible runbook. Never describe replayed data as a new live drill.

### 25.2 Submission content

The repository README starts with the problem, the product's narrow scope, and a path to run the demo. Include architecture, setup, requirements, test commands, supported adapter status, privacy, security limitations, license, and the exact difference between read-only mainnet behavior and test-funds execution.

Provide the working interface, source repository, demo video or live demonstration, and a brief pitch deck as requested by the event. Recheck the submission form before sending rather than inventing requirements not shown in the published rules. [S01, S02]

Suggested deck: problem; demonstrated workflow; technical evidence; independent kit and failure handling; scope, limitations, and future work. Do not use prize predictions, unsupported market sizes, fake user testimonials, or audit logos.

### 25.3 Product copy

**One sentence:** ExitDrill rehearses supported vault withdrawals and exports the tools to inspect that exit without depending on the original website.

**Demo closing:** “A website can disappear. Our prototype tests a supported exit, records what happened, and keeps the next check independent of our hosted service. It does not bypass a contract restriction or promise that a future transaction will succeed.”

## 26. Risks, release gates, and decisions

| Risk | Response |
|---|---|
| The selected real integration no longer behaves as expected | Validate first, keep adapter disabled on failure, and disclose the gap |
| RPC quota or historical-state support is insufficient | Capability-test configured providers; use a pinned reproducible block and bounded workloads |
| Anvil execution differs from target-chain semantics | Review chain/time-sensitive behavior and record every context difference |
| A saved report becomes stale | Preserve its timestamp and require a current preflight before test signing |
| The kit becomes another centralized dependency | Ship prebuilt assets, a local launcher, and a cold-start independence test |
| Checksums are mistaken for publisher authentication | Explicitly explain the trust anchor and withhold authenticity claims |
| Scope expands into arbitrary DeFi recovery | Keep one operation and one reviewed adapter |
| The product looks like a contract explorer | Center the preparation journey and the dependency-loss demonstration |
| Mainnet safety is weakened for a dramatic demo | Use test funds; make mainnet denial a release-blocking automated check |

### 26.1 Definition of done

The release is complete only when the P0 behaviors and acceptance tests pass, the real integration has documented validation, the kit works from a fresh environment without hosted services, and the demo accurately distinguishes source state, simulation, replay, and test transactions.

The specification is complete as a design document. Building the software, producing deployment addresses, collecting receipts, and passing these tests remain implementation work.

### 26.2 Explicit validation gates, not guessed facts

The implementation must produce the enabled registry and contract identity record; real adapter fork receipt; test-deployment manifest if used; exact dependency and tool versions; measured latency results; accessibility results; wallet compatibility results; and submission confirmation.

No generated code hash, future block number, testnet contract address, transaction hash, performance metric, or confirmation should be filled with a plausible-looking placeholder.

### 26.3 Build handoff

Treat this master document as the product and design source of truth. Begin with a registry-backed direct redemption and one successful genuine fork rehearsal. Build the standalone local path next. Do not add additional networks, contracts, AI tools, or account systems without an explicit scope decision.

Security and truthfulness invariants take priority over visual polish when they conflict. Visual polish still requires complete, understandable failure states rather than a polished success-only screen.

## 27. Sources and verification notes

External references were reviewed on 18 September 2026. They support the event facts and technical interfaces described here. Product architecture, limits, schedules, design tokens, and acceptance criteria are proposed requirements, not facts claimed by these sources.

**[S01] 3rd-Web-Hack overview.** Deadline, judging criteria, advertised prizes, overview eligibility, and submission deliverables. `https://3rd-web-hack.devpost.com/`

**[S02] 3rd-Web-Hack rules.** Original-work requirement, project requirements, and rules-page eligibility wording. `https://3rd-web-hack.devpost.com/rules`

**[S03] 3rd-Web-Hack schedule.** Submission and announcement schedule. `https://3rd-web-hack.devpost.com/details/dates`

**[S04] ERC-4626: Tokenized Vaults.** Standard interface, previews, limits, share/asset semantics, and direct redemption signature. `https://eips.ethereum.org/EIPS/eip-4626`

**[S05] Sky ecosystem Savings DAI repository and README.** Published integration target and deployment reference. This is not a current-state withdrawal test. `https://github.com/sky-ecosystem/sdai` and `https://raw.githubusercontent.com/sky-ecosystem/sdai/master/README.md`

**[S06] SavingsDai source.** Direct-owner execution path and interface behavior. Runtime/deployment matching still requires validation. `https://raw.githubusercontent.com/sky-ecosystem/sdai/master/src/SavingsDai.sol`

**[S07] ERC-7540: Asynchronous ERC-4626 Tokenized Vaults.** Basis for excluding asynchronous lifecycle support from P0. `https://eips.ethereum.org/EIPS/eip-7540`

**[S08] OpenZeppelin IERC4626 interface documentation.** Supporting interface reference for previews, limits, and operations. `https://docs.openzeppelin.com/contracts/5.x/api/interfaces#IERC4626`

**[S09] Foundry Anvil documentation.** Forking, impersonation, state management, tracing, and development-account cautions. `https://www.getfoundry.sh/anvil/index.html`

**[S10] Viem simulateContract documentation.** Read-only call simulation, return values, reverts, and state-override limitations. `https://viem.sh/docs/contract/simulateContract`

**[S11] OpenZeppelin ERC-4626 guide.** Standard vault implementation and fixture-extension reference. `https://docs.openzeppelin.com/contracts/5.x/erc4626`

**[S12] EIP-1193: Ethereum Provider JavaScript API.** Wallet request handling, account/chain events, and distinct rejection/disconnection errors. `https://eips.ethereum.org/EIPS/eip-1193`

**[S13] EIP-6963: Multi Injected Provider Discovery.** Explicit wallet provider discovery and relevant security considerations. `https://eips.ethereum.org/EIPS/eip-6963`

**[S14] W3C WCAG 2.2.** Accessibility reference, not an assertion that the unbuilt product conforms. `https://www.w3.org/TR/WCAG22/`

**[S15] MDN Content Security Policy implementation guide.** CSP scope and its role within, rather than instead of, broader XSS defenses. `https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSP`

---

**[S16] Ethereum networks documentation.** Sepolia application-testnet role and test-wallet separation guidance. `https://ethereum.org/developers/docs/networks/`

**[S17] Next.js self-hosting guide.** Deployment reference for the proposed hosted application. `https://nextjs.org/docs/app/guides/self-hosting`

**[S18] Vite production-build guide.** Build reference for the proposed prebuilt standalone interface. `https://vite.dev/guide/build`

---

**End of specification.** One reviewed exit. One genuine rehearsal. One independently usable kit. Clear evidence when it works, and an honest answer when it does not.
