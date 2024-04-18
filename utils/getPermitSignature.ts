import { BigNumberish, MaxUint256, Signature } from 'ethers';
import { IERC20Permit } from '../typechain-types/@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit';
import { ethers } from 'hardhat';

export async function getPermitSignature(
  wallet: Awaited<ReturnType<typeof ethers.getSigners>>[number],
  token: IERC20Permit,
  spender: string,
  value: BigNumberish = MaxUint256,
  deadline = MaxUint256,
  permitConfig?: {
    nonce?: BigNumberish;
    name?: string;
    chainId?: number;
    version?: string;
  },
): Promise<Signature> {
  const [nonce, name, version, chainId] = await Promise.all([
    permitConfig?.nonce ?? token.nonces(wallet.address),
    permitConfig?.name ?? (token as any).name(),
    permitConfig?.version ?? '1',
    permitConfig?.chainId ?? (await wallet.provider.getNetwork()).chainId,
  ]);

  return Signature.from(
    await wallet.signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: await token.getAddress(),
      },
      {
        Permit: [
          {
            name: 'owner',
            type: 'address',
          },
          {
            name: 'spender',
            type: 'address',
          },
          {
            name: 'value',
            type: 'uint256',
          },
          {
            name: 'nonce',
            type: 'uint256',
          },
          {
            name: 'deadline',
            type: 'uint256',
          },
        ],
      },
      {
        owner: wallet.address,
        spender,
        value,
        nonce,
        deadline,
      },
    ),
  );
}
