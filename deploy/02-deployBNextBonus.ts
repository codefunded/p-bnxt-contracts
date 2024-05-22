import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades, getNamedAccounts } from 'hardhat';
import { deploymentConfig } from '../deploymentConfig';

const deployBNextBonus: DeployFunction = async function ({ deployments }) {
  const { log, get } = deployments;
  const { owner } = await getNamedAccounts();

  const bnextToken = await get('BNext');

  const BNextBonusFactory = await ethers.getContractFactory('BNextBonus');

  const bnextBonus = await upgrades.deployProxy(
    BNextBonusFactory,
    [
      owner,
      deploymentConfig.args.bonus.initialSupply,
      deploymentConfig.args.bonus.name,
      deploymentConfig.args.bonus.symbol,
      bnextToken.address,
    ],
    {
      kind: 'uups',
    },
  );
  await bnextBonus.waitForDeployment();
  log(await bnextBonus.getAddress());

  log('-----BNextBonus deployed-----');
};

export default deployBNextBonus;

deployBNextBonus.tags = ['bonus'];
