import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre, { ethers, upgrades } from 'hardhat';

export const INITIAL_SUPPLY = ethers.parseEther(String(1_000_000_000n));

export async function deployBNext() {
  // Contracts are deployed using the first signer/account by default
  const [owner] = await hre.ethers.getSigners();

  const BNextFactory = await hre.ethers.getContractFactory('BNext');
  const BNextProxy = await upgrades.deployProxy(
    BNextFactory,
    [owner.address, INITIAL_SUPPLY, 'BNXT', 'BNXT'],
    {
      kind: 'uups',
    },
  );
  await BNextProxy.waitForDeployment();

  const bnext = await ethers.getContractAt('BNext', await BNextProxy.getAddress());
  const thirdPartyContractMockFactory = await ethers.getContractFactory(
    'ThridPartyContractMock',
  );
  const thridPartyContractMock = await thirdPartyContractMockFactory.deploy();
  return { bnext, thridPartyContractMock, owner };
}

export async function deployBNextBonus() {
  const { bnext, thridPartyContractMock, owner } = await loadFixture(deployBNext);

  const BNextBonusFactory = await hre.ethers.getContractFactory('BNextBonus');
  const BNextBonusProxy = await upgrades.deployProxy(
    BNextBonusFactory,
    [owner.address, INITIAL_SUPPLY, 'BNXT_B', 'BNXT_B', await bnext.getAddress()],
    {
      kind: 'uups',
    },
  );
  await BNextBonusProxy.waitForDeployment();

  const bnextBonus = await ethers.getContractAt(
    'BNextBonus',
    await BNextBonusProxy.getAddress(),
  );

  return { bnextBonus, bnext, thridPartyContractMock, owner };
}
