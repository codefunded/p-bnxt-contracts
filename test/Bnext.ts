import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { getPermitSignature } from '../utils/getPermitSignature';
import { INITIAL_SUPPLY, deployBNext } from '../utils/testUtils';

describe('BNext', function () {
  describe('Deployment', function () {
    it('Should set the correct token symbol', async function () {
      const { bnext } = await loadFixture(deployBNext);

      expect(await bnext.symbol()).to.equal('BNXT');
    });
  });

  describe('Upgrading', function () {
    it('Should upgrade the contract', async function () {
      const { owner, bnext } = await loadFixture(deployBNext);

      const MockUpgradeableTokenFactory =
        await ethers.getContractFactory('MockUpgradeableToken');
      await upgrades.upgradeProxy(await bnext.getAddress(), MockUpgradeableTokenFactory, {
        call: {
          fn: 'initialize',
          args: [],
        },
      });

      expect(await bnext.symbol()).to.equal('MOCK');
      expect(
        await bnext.hasRole(await bnext.DEFAULT_ADMIN_ROLE(), owner.address),
      ).to.equal(true);
    });
  });

  describe('Minting', () => {
    it('should mint total supply to the owner on deployment', async () => {
      const { bnext } = await loadFixture(deployBNext);

      expect(await bnext.totalSupply()).to.equal(INITIAL_SUPPLY);
    });
  });

  describe('Burning', () => {
    it('Should allow everyone to burn tokens', async () => {
      const { bnext } = await loadFixture(deployBNext);

      const [, other] = await ethers.getSigners();
      const amount = ethers.parseEther('100');

      await bnext.transfer(other.address, amount);
      await bnext.connect(other).burn(amount);

      expect(await bnext.balanceOf(other.address)).to.equal(0);
    });

    it('should allow to burn tokens in one transaction with permit', async () => {
      const { bnext, thridPartyContractMock } = await loadFixture(deployBNext);

      const [, other] = await ethers.getSigners();
      const amount = ethers.parseEther('100');

      const { r, s, v } = await getPermitSignature(
        other,
        bnext,
        await thridPartyContractMock.getAddress(),
        amount,
      );

      await bnext.transfer(other.address, amount);
      await thridPartyContractMock
        .connect(other)
        .burnWithPermit(
          await bnext.getAddress(),
          other.address,
          await thridPartyContractMock.getAddress(),
          amount,
          ethers.MaxUint256,
          v,
          r,
          s,
        );

      expect(await bnext.balanceOf(other.address)).to.equal(0);
    });
  });

  describe('Transfers', () => {
    it('Should allow transfers with permit', async () => {
      const { bnext, thridPartyContractMock } = await loadFixture(deployBNext);

      const [, other] = await ethers.getSigners();
      const amount = ethers.parseEther('100');

      const { r, s, v } = await getPermitSignature(
        other,
        bnext,
        await thridPartyContractMock.getAddress(),
        amount,
      );

      await bnext.transfer(other.address, amount);

      await thridPartyContractMock.transferWithPermit(
        await bnext.getAddress(),
        other.address,
        amount,
        ethers.MaxUint256,
        v,
        r,
        s,
      );

      expect(await bnext.balanceOf(thridPartyContractMock.getAddress())).to.equal(amount);
    });
  });

  describe('Batch transfer', () => {
    it('Should allow batch transfer', async () => {
      const { bnext } = await loadFixture(deployBNext);

      const [, other, other2] = await ethers.getSigners();
      const amount = ethers.parseEther('100');

      await bnext.batchTransfer([other.address, other2], [amount, amount]);

      expect(await bnext.balanceOf(other.address)).to.equal(amount);
      expect(await bnext.balanceOf(other2.address)).to.equal(amount);
    });
  });

  describe('Roles', () => {
    it('should allow only the ADMIN to grant roles', async () => {
      const { bnext } = await loadFixture(deployBNext);

      const [, other] = await ethers.getSigners();

      await expect(
        bnext.connect(other).grantRole(await bnext.FEE_MANAGER_ROLE(), other.address),
      ).to.be.revertedWithCustomError(bnext, 'AccessControlUnauthorizedAccount');

      await bnext.grantRole(await bnext.FEE_MANAGER_ROLE(), other.address);

      expect(await bnext.hasRole(await bnext.FEE_MANAGER_ROLE(), other.address)).to.equal(
        true,
      );
    });

    it('should allow an account to have more than one role', async () => {
      const { bnext } = await loadFixture(deployBNext);

      const [, other] = await ethers.getSigners();

      await bnext.grantRole(await bnext.FEE_MANAGER_ROLE(), other.address);
      await bnext.grantRole(await bnext.DEFAULT_ADMIN_ROLE(), other.address);

      expect(await bnext.hasRole(await bnext.FEE_MANAGER_ROLE(), other.address)).to.equal(
        true,
      );
      expect(
        await bnext.hasRole(await bnext.DEFAULT_ADMIN_ROLE(), other.address),
      ).to.equal(true);
    });

    it('should allow ADMIN to revoke roles', async () => {
      const { bnext } = await loadFixture(deployBNext);

      const [, other] = await ethers.getSigners();

      await bnext.grantRole(await bnext.FEE_MANAGER_ROLE(), other.address);

      expect(await bnext.hasRole(await bnext.FEE_MANAGER_ROLE(), other.address)).to.equal(
        true,
      );

      await bnext.revokeRole(await bnext.FEE_MANAGER_ROLE(), other.address);

      expect(await bnext.hasRole(await bnext.FEE_MANAGER_ROLE(), other.address)).to.equal(
        false,
      );
    });
  });

  describe('Fees', () => {
    it('should allow only the FEE_MANAGER to set fees', async () => {
      const { bnext } = await loadFixture(deployBNext);

      const [, other, feeTreasury] = await ethers.getSigners();

      await expect(
        bnext.connect(other).setFeeMode({
          feeType: 1, // percentage
          feePercentageInBasisPoints: 100, // 1%
          fixedFeeAmount: 0,
        }),
      ).to.be.revertedWithCustomError(bnext, 'AccessControlUnauthorizedAccount');

      await bnext.setFeeMode({
        feeType: 1, // percentage
        feePercentageInBasisPoints: 100, // 1%
        fixedFeeAmount: 0,
      });
      await bnext.setFeeTreasuryAddress(feeTreasury.address);

      const feeMode = await bnext.getFeeMode();
      expect(feeMode.feeType).to.equal(1);
      expect(feeMode.feePercentageInBasisPoints).to.equal(100);
      expect(feeMode.fixedFeeAmount).to.equal(0);
    });

    it('should transfer a percentage of the fee to the treasury', async () => {
      const { bnext } = await loadFixture(deployBNext);

      const [, other, feeTreasury] = await ethers.getSigners();

      await bnext.setFeeMode({
        feeType: 1, // percentage
        feePercentageInBasisPoints: 100, // 1%
        fixedFeeAmount: 0,
      });
      await bnext.setFeeTreasuryAddress(feeTreasury.address);

      const amount = ethers.parseEther('100');

      await bnext.transfer(other.address, amount);

      const treasuryBalance = await bnext.balanceOf(feeTreasury.address);
      const receiverBalance = await bnext.balanceOf(other.address);
      expect(treasuryBalance).to.equal(amount / 100n);
      expect(receiverBalance).to.equal(amount - amount / 100n);
    });

    it('should transfer a fixed fee amount to the treasury', async () => {
      const { bnext } = await loadFixture(deployBNext);

      const [, other, feeTreasury] = await ethers.getSigners();

      await bnext.setFeeMode({
        feeType: 2, // fixed
        feePercentageInBasisPoints: 0,
        fixedFeeAmount: ethers.parseEther('1'),
      });
      await bnext.setFeeTreasuryAddress(feeTreasury.address);

      const amount = ethers.parseEther('1000');

      await bnext.transfer(other.address, amount);

      const treasuryBalance = await bnext.balanceOf(feeTreasury.address);
      const receiverBalance = await bnext.balanceOf(other.address);
      expect(treasuryBalance).to.equal(ethers.parseEther('1'));
      expect(receiverBalance).to.equal(amount - ethers.parseEther('1'));
    });

    it('burning should not incur a fee', async () => {
      const { bnext } = await loadFixture(deployBNext);

      const [, other, feeTreasury] = await ethers.getSigners();

      await bnext.setFeeMode({
        feeType: 1, // percentage
        feePercentageInBasisPoints: 100, // 1%
        fixedFeeAmount: 0,
      });
      await bnext.setFeeTreasuryAddress(feeTreasury.address);

      const amount = ethers.parseEther('100');

      await bnext.transfer(other.address, amount);
      await bnext.connect(other).burn(ethers.parseEther('99'));

      const treasuryBalance = await bnext.balanceOf(feeTreasury.address);
      expect(treasuryBalance).to.equal(amount / 100n);
    });

    it('should incur a fee when batch transferring', async () => {
      const { bnext } = await loadFixture(deployBNext);

      const [, other, other2, feeTreasury] = await ethers.getSigners();

      await bnext.setFeeMode({
        feeType: 1, // percentage
        feePercentageInBasisPoints: 100, // 1%
        fixedFeeAmount: 0,
      });
      await bnext.setFeeTreasuryAddress(feeTreasury.address);

      const amount = ethers.parseEther('100');

      await bnext.batchTransfer([other.address, other2.address], [amount, amount]);

      const treasuryBalance = await bnext.balanceOf(feeTreasury.address);
      expect(treasuryBalance).to.equal((amount / 100n) * 2n);
    });

    describe('Whitelisted addresses excluded from fees', () => {
      it('should allow the FEE_MANAGER to add whitelisted addresses', async () => {
        const { bnext } = await loadFixture(deployBNext);

        const [owner, other, feeTreasury] = await ethers.getSigners();

        await bnext.setFeeMode({
          feeType: 1, // percentage
          feePercentageInBasisPoints: 100, // 1%
          fixedFeeAmount: 0,
        });
        await bnext.setFeeTreasuryAddress(feeTreasury.address);

        await bnext.setExcludedFromFees(owner.address, true);
        await bnext.transfer(other.address, ethers.parseEther('100'));
        // 1% fee should not be deducted
        expect(await bnext.balanceOf(other.address)).to.equal(ethers.parseEther('100'));
      });

      it('should allow the FEE_MANAGER to remove whitelisted addresses', async () => {
        const { bnext } = await loadFixture(deployBNext);

        const [owner, other, feeTreasury] = await ethers.getSigners();

        await bnext.setFeeMode({
          feeType: 1, // percentage
          feePercentageInBasisPoints: 100, // 1%
          fixedFeeAmount: 0,
        });
        await bnext.setFeeTreasuryAddress(feeTreasury.address);

        await bnext.setExcludedFromFees(owner.address, false);
        await bnext.transfer(other.address, ethers.parseEther('100'));
        // 1% fee should be deducted
        expect(await bnext.balanceOf(other.address)).to.equal(ethers.parseEther('99'));
      });
    });
  });
});
