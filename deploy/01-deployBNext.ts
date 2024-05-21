import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades, getNamedAccounts } from 'hardhat';
import { deploymentConfig } from '../deploymentConfig';

const deployBNext: DeployFunction = async function ({ deployments }) {
  const { log, save } = deployments;
  const { owner } = await getNamedAccounts();

  const BNextFactory = await ethers.getContractFactory('BNext');

  const bnext = await upgrades.deployProxy(
    BNextFactory,
    [
      owner,
      deploymentConfig.args.initialSupply,
      deploymentConfig.args.name,
      deploymentConfig.args.symbol,
    ],
    {
      kind: 'uups',
    },
  );
  await bnext.waitForDeployment();

  log(await bnext.getAddress());

  await save('BNext', {
    abi: bnext.interface.format(),
    address: await bnext.getAddress(),
  });

  log('-----BNext deployed-----');
};

export default deployBNext;

deployBNext.tags = ['bnext'];
