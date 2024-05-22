// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC1967Proxy } from '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import { ERC20Upgradeable } from '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ERC20BurnableUpgradeable } from '@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol';
import { ERC20PermitUpgradeable } from '@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol';
import { AccessControlUpgradeable } from '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import { PausableUpgradeable } from '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import { UUPSUpgradeable } from '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import { DateTimeLib } from 'solady/src/utils/DateTimeLib.sol';
import { FeeMode, FeeModeType } from './Fee.sol';

error BNextBonus__BatchTransferArgsLengthMismatch();
error BNextBonus__AddressIsNotAllowedToTransfer();

contract BNextBonus is
  Initializable,
  ERC20Upgradeable,
  ERC20BurnableUpgradeable,
  ERC20PermitUpgradeable,
  AccessControlUpgradeable,
  UUPSUpgradeable,
  PausableUpgradeable
{
  event TransferWhitelistChanged(address indexed account, bool isAllowed);

  /// @custom:storage-location erc7201:bnext.bonus
  struct MainStorage {
    address underlyingAsset;
    mapping(address => bool) isAddressAllowedToTransfer;
  }

  // keccak256(abi.encode(uint256(keccak256('bnext.bonus')) - 1)) & ~bytes32(uint256(0xff));
  bytes32 private constant MAIN_STORAGE_LOCATION =
    0x05dc375378b3cb48ced46aecc557f7530240a16fea817f1e3f8af336a8035700;

  function _getMainStorage() private pure returns (MainStorage storage $) {
    assembly {
      $.slot := MAIN_STORAGE_LOCATION
    }
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address _owner,
    uint256 _initialSupply,
    string memory _name,
    string memory _symbol,
    address _underlyingAsset
  ) public initializer {
    __ERC20_init(_name, _symbol);
    __ERC20Burnable_init();
    __ERC20Permit_init(_name);
    __AccessControl_init();
    __Pausable_init();
    _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    __UUPSUpgradeable_init();

    MainStorage storage s = _getMainStorage();
    s.underlyingAsset = _underlyingAsset;

    // owner is by default allowed to transfer
    setIsAddressAllowedToTransfer(_owner, true);

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
      revert BNextBonus__BatchTransferArgsLengthMismatch();
    }

    for (uint256 i = 0; i < recipients.length; i++) {
      transfer(recipients[i], amounts[i]);
    }
  }

  function setIsAddressAllowedToTransfer(
    address account,
    bool isAllowed
  ) public onlyRole(DEFAULT_ADMIN_ROLE) {
    MainStorage storage s = _getMainStorage();
    s.isAddressAllowedToTransfer[account] = isAllowed;

    emit TransferWhitelistChanged(account, isAllowed);
  }

  function isAddressAllowedToTransfer(address account) public view returns (bool) {
    MainStorage storage s = _getMainStorage();
    return s.isAddressAllowedToTransfer[account];
  }

  function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
    _pause();
  }

  function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
    _unpause();
  }

  function withdrawUnderlyingToken(
    address to,
    uint256 amount
  ) public onlyRole(DEFAULT_ADMIN_ROLE) {
    SafeERC20.safeTransfer(IERC20(_getMainStorage().underlyingAsset), to, amount);
  }

  function _update(
    address from,
    address to,
    uint256 value
  ) internal override whenNotPaused {
    super._update(from, to, value);
    // mints and burns are allowed and they do not carry underlying asset
    if (from == address(0) || to == address(0)) {
      return;
    }
    MainStorage storage s = _getMainStorage();
    if (!s.isAddressAllowedToTransfer[from]) {
      revert BNextBonus__AddressIsNotAllowedToTransfer();
    }
    // This is gonna fail if there is not enough underlying asset in the contract
    SafeERC20.safeTransfer(IERC20(s.underlyingAsset), to, value);
  }
}
