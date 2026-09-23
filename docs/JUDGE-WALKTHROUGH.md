# ExitDrill judge walkthrough

The vault website disappears. Your saved exit tools remain available.

ExitDrill rehearses an exact ERC-4626 redemption and exports the plan, evidence, and an independent interface. Mainnet execution is confined to a private fork; mainnet broadcasting is disabled.

## A two-minute hosted demonstration

1. Open the live app and select **Inspect a position** → **Try a public sDAI position**. This example does not imply control of the address.
2. Inspect, enter **1** sDAI, then run the rehearsal. The worker executes in a private fork and verifies the receipt, withdrawal event, shares, assets, and supply. Let the real result appear; do not replace a failure with a recorded success.
3. Expand the evidence. Explain that PASS describes this historical execution, while UNKNOWN means evidence could not be established.
4. Export the kit and show its offline guide, saved report, exact plan, and launcher. Fresh checks need Node.js 22+ and an RPC; saved evidence does not need a server.
5. Show the independent kit running after local app/API shutdown. Run a fresh preflight, which checks the current call but is weaker than a complete fork rehearsal.

## The decisive failure comparison

Choose **Use test funds**, then **Execution reverts**. Its positive preview does not produce a PASS: the actual call is BLOCKED. A failed RPC produces UNKNOWN. These outcomes must stay distinct.

## Demonstrating local test signing

Use a disposable local Anvil account and an EIP-6963 wallet extension with chain 31337. Never use a real wallet or fund a development account with real assets. Rehearse, export, stop only the app/API, keep Anvil running, launch the kit with `--local-fixture`, configure the local RPC, and run a fresh preflight. Review the exact owner, receiver, vault, amount, and network before confirming the test transaction. Verify its receipt and resulting balance changes.

This extension sequence remains unverified in the available browser. The automated EIP-1193 harness checks an actual local transaction and receipt; it is not extension-compatibility evidence. Do not splice those two claims together in a video.

## What is measured

See `evidence/hosted-reliability.json` for each hosted attempt, including failures, and `evidence/outage-sep23.json` for the latest app-off kit check. The hosted benchmark is sequential and does not measure concurrent capacity or cold starts. The five-person usability protocol exists, but no participants have completed it. User demand remains a hypothesis.
