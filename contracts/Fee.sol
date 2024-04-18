// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

enum FeeModeType {
  NONE,
  PERCENTAGE,
  FIXED
}

struct FeeMode {
  FeeModeType feeType;
  uint16 feePercentageInBasisPoints;
  uint256 fixedFeeAmount;
}
