import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { deployBNextBonus } from '../utils/testUtils';
import { ethers } from 'hardhat';

describe('BNextBonus', function () {
  describe('Deployment', function () {
    it('Should set the correct token symbol', async function () {
      const { bnextBonus } = await loadFixture(deployBNextBonus);

      expect(await bnextBonus.symbol()).to.equal('BNXT_B');
    });
  });

  describe('Transfer whitelist', function () {
    it('Should allow contract deployer to transfer tokens by default', async function () {
      const { bnextBonus, bnext } = await loadFixture(deployBNextBonus);

      const [, target] = await ethers.getSigners();

      // supply underlying token to bonus contract
      const amount = ethers.parseEther('100');
      await bnext.transfer(await bnextBonus.getAddress(), amount);

      expect(await bnext.balanceOf(await bnextBonus.getAddress())).to.equal(amount);

      await bnextBonus.transfer(await target.getAddress(), amount);

      expect(await bnext.balanceOf(await target.getAddress())).to.equal(amount);
      expect(await bnextBonus.balanceOf(await target.getAddress())).to.equal(amount);
    });

    it('Should allow owner to add address to transfer whitelist', async function () {
      const { bnextBonus } = await loadFixture(deployBNextBonus);

      const [, target] = await ethers.getSigners();

      expect(await bnextBonus.isAddressAllowedToTransfer(target.address)).to.equal(false);
      await bnextBonus.setIsAddressAllowedToTransfer(target.address, true);
      expect(await bnextBonus.isAddressAllowedToTransfer(target.address)).to.equal(true);
    });

    it('Should allow owner to remove address from transfer whitelist', async function () {
      const { bnextBonus } = await loadFixture(deployBNextBonus);

      const [owner] = await ethers.getSigners();

      expect(await bnextBonus.isAddressAllowedToTransfer(owner.address)).to.equal(true);
      await bnextBonus.setIsAddressAllowedToTransfer(owner.address, false);
      expect(await bnextBonus.isAddressAllowedToTransfer(owner.address)).to.equal(false);
    });
  });

  describe('Pausability', function () {
    it('Should allow owner to pause contract', async function () {
      const { bnextBonus, owner } = await loadFixture(deployBNextBonus);

      await bnextBonus.pause();

      expect(await bnextBonus.paused()).to.equal(true);

      await expect(bnextBonus.transfer(owner.address, 1)).to.be.revertedWithCustomError(
        bnextBonus,
        'EnforcedPause',
      );
    });

    it('Should allow owner to unpause contract', async function () {
      const { bnext, bnextBonus, owner } = await loadFixture(deployBNextBonus);

      const [, target] = await ethers.getSigners();

      await bnextBonus.pause();

      await bnext.transfer(await bnextBonus.getAddress(), ethers.parseEther('100'));

      expect(await bnextBonus.paused()).to.equal(true);

      await expect(bnextBonus.transfer(target.address, 1)).to.be.revertedWithCustomError(
        bnextBonus,
        'EnforcedPause',
      );

      await bnextBonus.unpause();

      expect(await bnextBonus.paused()).to.equal(false);

      await bnextBonus.transfer(target.address, ethers.parseEther('100'));

      expect(await bnext.balanceOf(target.address)).to.equal(ethers.parseEther('100'));
    });
  });

  describe('Underlying token transfers', function () {
    it('Should transfer underlying token when bonus token is moved', async function () {
      const { bnextBonus, bnext } = await loadFixture(deployBNextBonus);

      const [, targetUser] = await ethers.getSigners();

      // supply underlying token to bonus contract
      const amount = ethers.parseEther('100');
      await bnext.transfer(await bnextBonus.getAddress(), amount);

      expect(await bnext.balanceOf(await bnextBonus.getAddress())).to.equal(amount);

      expect(await bnext.balanceOf(await targetUser.getAddress())).to.equal(0n);
      expect(await bnextBonus.balanceOf(await targetUser.getAddress())).to.equal(0n);

      await bnextBonus.transfer(await targetUser.getAddress(), amount);

      expect(await bnext.balanceOf(await targetUser.getAddress())).to.equal(amount);
      expect(await bnextBonus.balanceOf(await targetUser.getAddress())).to.equal(amount);
    });

    it('Should not allow to transfer tokens when not whitelisted', async function () {
      const { bnextBonus, bnext } = await loadFixture(deployBNextBonus);

      const [, notWhitelistedUser, target] = await ethers.getSigners();

      // supply underlying token to bonus contract
      const amount = ethers.parseEther('100');
      await bnext.transfer(await bnextBonus.getAddress(), amount);
      await bnextBonus.transfer(await notWhitelistedUser.getAddress(), amount);
      // user transfers back tokens to bonus contract
      await bnext
        .connect(notWhitelistedUser)
        .transfer(await bnextBonus.getAddress(), amount);

      await expect(
        bnextBonus.connect(notWhitelistedUser).transfer(target.address, amount),
      ).to.be.revertedWithCustomError(
        bnextBonus,
        'BNextBonus__AddressIsNotAllowedToTransfer',
      );
    });

    it('Should allow owner to allow other address to transfer', async function () {
      const { bnextBonus, bnext } = await loadFixture(deployBNextBonus);

      const [, whitelistedAddress, targetUser] = await ethers.getSigners();

      // supply underlying token to bonus contract
      const amount = ethers.parseEther('100');
      await bnext.transfer(await bnextBonus.getAddress(), amount);
      await bnextBonus.transfer(await whitelistedAddress.getAddress(), amount);
      // user transfers back tokens to bonus contract
      await bnext
        .connect(whitelistedAddress)
        .transfer(await bnextBonus.getAddress(), amount);

      await bnextBonus.setIsAddressAllowedToTransfer(whitelistedAddress.address, true);

      await bnextBonus.connect(whitelistedAddress).transfer(targetUser.address, amount);

      expect(await bnext.balanceOf(await targetUser.getAddress())).to.equal(amount);
      expect(await bnextBonus.balanceOf(await targetUser.getAddress())).to.equal(amount);
      expect(await bnext.balanceOf(await whitelistedAddress.getAddress())).to.equal(0n);
      expect(await bnextBonus.balanceOf(await whitelistedAddress.getAddress())).to.equal(
        0n,
      );
    });
  });

  describe('Underlying token withdrawal', function () {
    it('Should allow owner to withdraw underlying token', async function () {
      const { bnextBonus, bnext } = await loadFixture(deployBNextBonus);

      const [owner] = await ethers.getSigners();

      const amount = ethers.parseEther('100');
      await bnext.transfer(await bnextBonus.getAddress(), amount);
      const balanceOfOwnerBeforeWithrdawal = await bnext.balanceOf(owner.address);

      expect(await bnext.balanceOf(await bnextBonus.getAddress())).to.equal(amount);

      await bnextBonus.withdrawUnderlyingToken(owner.address, amount);

      expect(await bnext.balanceOf(await bnextBonus.getAddress())).to.equal(0n);
      expect(await bnext.balanceOf(owner.address)).to.equal(
        balanceOfOwnerBeforeWithrdawal + amount,
      );
    });

    it('Should not allow non-owner to withdraw underlying token', async function () {
      const { bnextBonus } = await loadFixture(deployBNextBonus);

      const [, notOwner] = await ethers.getSigners();

      const amount = ethers.parseEther('100');

      await expect(
        bnextBonus.connect(notOwner).withdrawUnderlyingToken(notOwner.address, amount),
      ).to.be.revertedWithCustomError(bnextBonus, 'AccessControlUnauthorizedAccount');
    });
  });
});
