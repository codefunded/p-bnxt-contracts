// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20Burnable } from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import { IERC20Permit } from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol';

contract ThridPartyContractMock {
  function burnWithPermit(
    address token,
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external {
    IERC20Permit(token).permit(owner, spender, value, deadline, v, r, s);
    ERC20Burnable(token).burnFrom(owner, value);
  }

  function transferWithPermit(
    address token,
    address owner,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external {
    IERC20Permit(token).permit(owner, address(this), value, deadline, v, r, s);
    ERC20Burnable(token).transferFrom(owner, address(this), value);
  }
}
