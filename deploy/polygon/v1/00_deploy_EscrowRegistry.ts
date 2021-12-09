import { DeployFunction } from "hardhat-deploy/types";

const contractName = "EscrowRegistry";
const version = "v1";

const func: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
}) {
  const { deploy } = deployments;
  const { deployer, trustedForwarder } = await getNamedAccounts();

  await deploy(contractName, {
    from: deployer,
    log: true,
    args: [trustedForwarder],
  });
};

export default func;
func.tags = [contractName, version];
func.id = contractName + version;
