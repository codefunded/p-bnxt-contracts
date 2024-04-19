import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades } from 'hardhat';
import { deploymentConfig } from '../deploymentConfig';

const deployBNext: DeployFunction = async function ({ getUnnamedAccounts, deployments }) {
  const { log } = deployments;
  const [deployer] = await getUnnamedAccounts();

  const BNextFactory = await ethers.getContractFactory('BNext');

  const bnext = await upgrades.deployProxy(
    BNextFactory,
    [deployer, deploymentConfig.args.initialSupply],
    {
      kind: 'uups',
    },
  );
  await bnext.waitForDeployment();
  log(await bnext.getAddress());

  log('-----BNext deployed-----');
};

export default deployBNext;

deployBNext.tags = [];
