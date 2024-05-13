# BeNext token contracts

This repository contains the smart contracts for the BNXT ERC20 token. Built on Solidity ^0.8.20, it utilizes OpenZeppelin's libraries to provide advanced functionalities like upgradeability, access control, and token burning.

## Functions

- **ERC-20 Compatibility**: Fully compatible with the ERC-20 standard.
- **Upgradeability**: Utilizes UUPS (Universal Upgradeable Proxy Standard) for easy upgrades.
- **Fee Management**: Supports setting and adjusting token transfer fees in various modes (none, fixed, percentage).
- **Access Control**: Restricts critical functionalities to users with specific roles.
- **Burnability**: Tokens can be burned to reduce the total supply.
- **Batch Transfers**: Allows batch processing of multiple transfers simultaneously.
- **Permit**: ERC-20 tokens can be spent by another address on behalf of the token owner without needing a transaction from the owner's address (via ERC-20 Permit).

## Prerequisites

Before setting up the `BNext` smart contract, ensure that you have the following prerequisites installed:

- [Node.js and npm](https://nodejs.org/en/download/)
- Hardhat (should be installed globally)
  ```bash
  npm install --global hardhat-shorthand
  ```

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure .env file**
   Setup following variables in .env file which is located in root directory of the project:
   ```
    POLYGONSCAN_API_KEY= // API token fetched from https://polygonscan.com/ in order to verify smart contracts
    POLYGON_MAINNET_RPC= // RPC url
    PRIVATE_KEY= // private key which is owner of smart contract
    POLYGON_TESTNET_RPC= // RPC url of the testnet if you are deploying it to amoy
   ```

2. **Compile the smart contract:**
   ```bash
   npx hardhat compile
   ```

## Testing

In order to run unit tests use `npx hardhat test` command.

If you want to test the uniswap v3 integration, then edit the `hardhat.config.ts` file. Make the hardhat network be forking a real network like polygon and then run `npx hardhat run scripts/testMintingLiquidityPositionUniswapV3.ts` to mint the liquidity on a localhost fork.

## Deployment

Edit values in `deploymentConfig.ts` file to configure the deployment.

Run `npx hardhat deploy --network natworkName` to deploy the contracts to the desired network.

Deployed contracts:
- Amoy (Polygon Testnet): `0xc6c28445a8650F970EC278C969BcE933FcE92BB5`

## Verify smart contract

To verify smart contract, ensure you've set POLYGONSCAN_API_KEY in `.env` and smart contract is deployed to the selected network. Then run following command:

```bash
npx hardhat verify --network polygon YOUR_CONTRACT_ADDRESS
```

NOTE: currently hardhat verify does not support amoy network

## Features

### Fee

In the smart contract, fee management is a key feature that allows the contract administrator to impose transaction fees on token transfers, which can be configured in different modes according to the business needs.

#### Fee Management

**Struct Definition (`FeeMode`):**
- `feeType`: Determines the type of fee applied. It can be either none, fixed, or percentage.
  - **None**: No fees are applied to the transactions.
  - **Fixed**: A fixed amount of tokens is deducted as a fee.
  - **Percentage**: A percentage of the transaction amount is deducted as a fee.
- `feePercentageInBasisPoints`: If the fee type is percentage, this value determines the fee rate. For example, 100 basis points equals 1%.
- `fixedFeeAmount`: If the fee type is fixed, this value is the fixed amount of tokens that will be deducted from each transaction as a fee.

**Fee Application:**
- The fee settings are managed by an address with the `FEE_MANAGER_ROLE`, which typically would be assigned to the contract administrator or a designated fee manager.

#### Fee Setting Functions
- `setFeeMode(FeeMode memory feeMode)`: This function sets the fee mode. It updates the fee structure according to the input parameters (either none, fixed, or percentage).
- `setFeeTreasuryAddress(address feeTreasuryAddress)`: Sets the treasury address where collected fees are sent.

#### Fee Logic in Token Transfers
- When a token transfer occurs (e.g., in the `batchTransfer` function), the contract checks the current fee settings.
- If the `feeType` is `NONE`, the transfer proceeds normally without any deductions.
- For a `FIXED` fee type, the specified `fixedFeeAmount` is deducted from the transferred amount and sent to the treasury address.
- For a `PERCENTAGE` fee type, the fee is calculated as a percentage of the transferred amount based on `feePercentageInBasisPoints`. This calculated fee is then deducted from the transferred amount and sent to the treasury address.

**Fee Exemption:**
- The contract allows for certain addresses to be exempt from fees. This is managed through the `setExcludedFromFees(address account, bool isExcluded)` function, which updates a mapping in the contract's storage to track which addresses are exempt.

**Event Emissions:**
- The `BNext__AddressExcludedFromFees` event is emitted whenever an address is set to be exempt from fees, providing transparency and traceability.