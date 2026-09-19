# Exit plan digest

The digest detects differences between independently derived plans. It does not authenticate an untrusted publisher.

## Canonical encoding

1. Exclude `planDigest` from the hashed object.
2. Normalize addresses with EIP-55 checksum via `viem.getAddress`.
3. Normalize hashes and calldata to lowercase `0x`-prefixed hex.
4. Encode integer quantities as base-10 decimal strings with no leading zeros except `0`.
5. Serialize the following keys in this exact order as a JSON array of `[key, value]` pairs (not a JSON object, so key order cannot vary):

```text
schemaVersion
adapterId
adapterVersion
registryDigest
sourceChainId
sourceBlockNumber
sourceBlockHash
owner
receiver
target
operation
sharesRaw
valueRaw
calldata
```

6. UTF-8 encode the JSON array with no extra whitespace.
7. Hash with keccak256. Store as lowercase `0x` hex.

Hosted and local code must import the same `digestExitPlan` implementation.
