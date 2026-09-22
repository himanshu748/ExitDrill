// Generated from verified local fixture deployment. Rebuild after redeployment.
export const pinnedRegistry = [
  {
    "id": "fixture-0",
    "label": "Normal exit",
    "enabled": true,
    "chainId": 31337,
    "target": "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
    "asset": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    "symbol": "tSHARE",
    "assetSymbol": "tDAI",
    "decimals": 18,
    "assetDecimals": 18,
    "codeHash": "0x997227766be227fdcf05530aef0a6e6b54d7206a792d2bccf582e914413e92e3",
    "assetCodeHash": "0x51ca72cdbffe8a7bbf716f1d74b75d6476fcb53de285d51f71790fc9a1a65b24",
    "adapterVersion": "0.1.0",
    "environment": "LOCAL_FIXTURE",
    "signing": true
  },
  {
    "id": "fixture-1",
    "label": "Redemption restricted",
    "enabled": true,
    "chainId": 31337,
    "target": "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
    "asset": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    "symbol": "tSHARE",
    "assetSymbol": "tDAI",
    "decimals": 18,
    "assetDecimals": 18,
    "codeHash": "0x2ff28e0c2f059dff692d3df3d355ff83e6ad77204858b90549f5194936b26adc",
    "assetCodeHash": "0x51ca72cdbffe8a7bbf716f1d74b75d6476fcb53de285d51f71790fc9a1a65b24",
    "adapterVersion": "0.1.0",
    "environment": "LOCAL_FIXTURE",
    "signing": true
  },
  {
    "id": "fixture-2",
    "label": "Limited redemption",
    "enabled": true,
    "chainId": 31337,
    "target": "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853",
    "asset": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    "symbol": "tSHARE",
    "assetSymbol": "tDAI",
    "decimals": 18,
    "assetDecimals": 18,
    "codeHash": "0xe6e6d83a2d5f058fa3f62e8899a59c26f1e0b41b2075fd3a3a4fc699384024ec",
    "assetCodeHash": "0x51ca72cdbffe8a7bbf716f1d74b75d6476fcb53de285d51f71790fc9a1a65b24",
    "adapterVersion": "0.1.0",
    "environment": "LOCAL_FIXTURE",
    "signing": true
  },
  {
    "id": "fixture-3",
    "label": "Execution reverts",
    "enabled": true,
    "chainId": 31337,
    "target": "0x610178da211fef7d417bc0e6fed39f05609ad788",
    "asset": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    "symbol": "tSHARE",
    "assetSymbol": "tDAI",
    "decimals": 18,
    "assetDecimals": 18,
    "codeHash": "0x42d38553aeb26bdf0fae7a01a16f920e82b56d1207ef361b9fd23d6a1ff135ae",
    "assetCodeHash": "0x51ca72cdbffe8a7bbf716f1d74b75d6476fcb53de285d51f71790fc9a1a65b24",
    "adapterVersion": "0.1.0",
    "environment": "LOCAL_FIXTURE",
    "signing": true
  },
  {
    "id": "sdai-mainnet",
    "label": "Savings DAI",
    "enabled": true,
    "chainId": 1,
    "target": "0x83F20F44975D03b1b09e64809B757c47f942BEeA",
    "asset": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "symbol": "sDAI",
    "assetSymbol": "DAI",
    "decimals": 18,
    "assetDecimals": 18,
    "codeHash": "0x6135b62a3a5f6ed21408c83b3ce280b35144264cd680d6e78bb48fa8ed4db076",
    "assetCodeHash": "0x4e36f96ee1667a663dfaac57c4d185a0e369a3a217e0079d49620f34f85d1ac7",
    "adapterVersion": "0.1.0",
    "environment": "MAINNET_READ",
    "signing": false,
    "dependencies": [
      {
        "address": "0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B",
        "codeHash": "0x808b98f6475736d56c978e4fb476175ecd9d7abdab0797017fc10c7f46311a59"
      },
      {
        "address": "0x9759A6Ac90977b93B58547b4A71c78317f391A28",
        "codeHash": "0x76dac2e14412f6ee4c5ca566296c954598168738955fa974cb3302cb73b95f0f"
      },
      {
        "address": "0x197E90f9FAD81970bA7976f33CbD77088E5D7cf7",
        "codeHash": "0x29432afb0411f4946c86ea9eb2583aba0e1e80386024c098b269306aba33f938"
      }
    ],
    "abiDigest": "0xb225f42c6c527d991385159a725016b3007880effdd9881ad59aa96c0d44f794"
  }
] as const;
