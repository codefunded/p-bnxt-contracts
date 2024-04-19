import { ethers } from 'hardhat';

export const deploymentConfig = {
  args: {
    initialSupply: ethers.parseEther(String(1_000_000_000n)),
  },
};
