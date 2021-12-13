import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { node_url, accounts } from "./utils/network";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      accounts: accounts(),
      initialBaseFeePerGas: 0, // workaround from https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136 . Remove when that issue is closed.
      deploy: ["deploy/hardhat/v1", "deploy/polygon/v1"],
      tags: ["test", "local"],
    },
    mumbai: {
      url: node_url("mumbai"),
      accounts: accounts("mumbai"),
      deploy: ["deploy/polygon/v1"],
      tags: ["staging"],
    },
    polygon: {
      url: node_url("polygon"),
      accounts: accounts("polygon"),
      deploy: ["deploy/polygon/v1"],
      tags: ["production"],
    },
  },
  namedAccounts: {
    deployer: 0,
    trustedForwarder: {
      default: 1,
    },
    seller: 2,
    buyer: 3,
    arbitrator: 4,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY,
  },
};

export default config;
