// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC1967Proxy } from '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import { ERC20Upgradeable } from '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import { ERC20BurnableUpgradeable } from '@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol';
import { ERC20PermitUpgradeable } from '@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol';
import { AccessControlUpgradeable } from '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import { UUPSUpgradeable } from '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import { DateTimeLib } from 'solady/src/utils/DateTimeLib.sol';
import { FeeMode, FeeModeType } from './Fee.sol';

error BNext__BatchTransferArgsLengthMismatch();
error BNext__InvalidFeeMode();

contract BNext is
  Initializable,
  ERC20Upgradeable,
  ERC20BurnableUpgradeable,
  ERC20PermitUpgradeable,
  AccessControlUpgradeable,
  UUPSUpgradeable
{
  bytes32 public constant FEE_MANAGER_ROLE = keccak256('FEE_MANAGER');

  event BNext__AddressExcludedFromFees(address indexed account, bool isExcluded);

  /// @custom:storage-location erc7201:bnext.main
  struct MainStorage {
    address feeTreasuryAddress;
    FeeMode feeMode;
    mapping(address => bool) isExcludedFromFees;
  }

  // keccak256(abi.encode(uint256(keccak256('bnext.main')) - 1)) & ~bytes32(uint256(0xff));
  bytes32 private constant MAIN_STORAGE_LOCATION =
    0xdf3f97ce685e3a791cdb7b82bfe7f1870f71c5bfa190fa44e4d96d58a17b9d00;

  function _getMainStorage() private pure returns (MainStorage storage $) {
    assembly {
      $.slot := MAIN_STORAGE_LOCATION
    }
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address _owner, uint256 _initialSupply, string memory _name, string memory _symbol) public initializer {
    __ERC20_init(_name, _symbol);
    __ERC20Burnable_init();
    __ERC20Permit_init(_name);
    __AccessControl_init();
    _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    _grantRole(FEE_MANAGER_ROLE, _owner);
    __UUPSUpgradeable_init();

    MainStorage storage s = _getMainStorage();

    s.feeMode = FeeMode({
      feeType: FeeModeType.NONE,
      feePercentageInBasisPoints: 0,
      fixedFeeAmount: 0
    });
    s.feeTreasuryAddress = _owner;

    _mint(_msgSender(), _initialSupply);
  }

  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

  function burn(uint256 amount) public override {
    _burn(_msgSender(), amount);
  }

  function batchTransfer(
    address[] calldata recipients,
    uint256[] calldata amounts
  ) public {
    if (recipients.length != amounts.length) {
      revert BNext__BatchTransferArgsLengthMismatch();
    }

    for (uint256 i = 0; i < recipients.length; i++) {
      transfer(recipients[i], amounts[i]);
    }
  }

  function setFeeMode(FeeMode memory feeMode) public onlyRole(FEE_MANAGER_ROLE) {
    MainStorage storage s = _getMainStorage();
    s.feeMode = feeMode;
  }

  function setFeeTreasuryAddress(
    address feeTreasuryAddress
  ) public onlyRole(FEE_MANAGER_ROLE) {
    MainStorage storage s = _getMainStorage();
    s.feeTreasuryAddress = feeTreasuryAddress;
  }

  function setExcludedFromFees(
    address account,
    bool isExcluded
  ) public onlyRole(FEE_MANAGER_ROLE) {
    MainStorage storage s = _getMainStorage();
    s.isExcludedFromFees[account] = isExcluded;

    emit BNext__AddressExcludedFromFees(account, isExcluded);
  }

  function getFeeMode() public view returns (FeeMode memory) {
    MainStorage storage s = _getMainStorage();
    return s.feeMode;
  }

  function _update(address from, address to, uint256 value) internal override {
    MainStorage storage s = _getMainStorage();
    address feeTreasuryAddress = s.feeTreasuryAddress;
    FeeMode memory currentFeeMode = s.feeMode;

    if (
      currentFeeMode.feeType == FeeModeType.NONE ||
      to == address(0) ||
      s.isExcludedFromFees[from]
    ) {
      super._update(from, to, value);
      return;
    }

    if (currentFeeMode.feeType == FeeModeType.FIXED) {
      super._update(from, to, value - currentFeeMode.fixedFeeAmount);
      super._update(from, feeTreasuryAddress, currentFeeMode.fixedFeeAmount);
      return;
    }

    if (currentFeeMode.feeType == FeeModeType.PERCENTAGE) {
      uint256 fee = (value * currentFeeMode.feePercentageInBasisPoints) / 10000;
      uint256 valueAfterFee = value - fee;
      super._update(from, to, valueAfterFee);
      super._update(from, feeTreasuryAddress, fee);
      return;
    }

    revert BNext__InvalidFeeMode();
  }
}
