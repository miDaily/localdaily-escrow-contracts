import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { ethers, getNamedAccounts, deployments } from "hardhat";
import { ERC20Mock, EscrowRegistry } from "../typechain";

describe("EscrowRegistry", function () {
  let escrowRegistryContract: EscrowRegistry;
  let erc20Mock: ERC20Mock;
  let trustedForwarder: string;
  let seller: string;
  let buyer: string;
  let arbitrator: string;
  let trustedForwarderSigner: SignerWithAddress;

  before(async () => {
    // Get the accounts
    const accounts = await getNamedAccounts();
    trustedForwarder = accounts["trustedForwarder"];
    seller = accounts["seller"];
    buyer = accounts["buyer"];
    arbitrator = accounts["arbitrator"];
    // Get the signers
    trustedForwarderSigner = await ethers.getNamedSigner("trustedForwarder");
  });

  beforeEach(async () => {
    // Make sure every test is started from a clean deployment fixture
    await deployments.fixture(["EscrowRegistry", "ERC20Mock"]);

    // Get the contracts to test
    escrowRegistryContract = await ethers.getContract("EscrowRegistry");
    erc20Mock = await ethers.getContract("ERC20Mock");
  });

  describe("Deploying", () => {
    it("Should set the trusted forwarder", async function () {
      expect(await escrowRegistryContract.trustedForwarder()).to.equal(
        trustedForwarder
      );

      //const setGreetingTx = await greeter.setGreeting("Hola, mundo!");
      // wait until the transaction is mined
      //await setGreetingTx.wait();
    });

    it("Should start the escrows counter at 0", async function () {
      expect(await escrowRegistryContract.escrowsCount()).to.equal(
        BigNumber.from(0)
      );
    });
  });

  describe("Creating an escrow", () => {
    it("Should increment the escrow counter", async function () {
      const testIterations = 20;
      let counterValue = await escrowRegistryContract.escrowsCount();
      for (let i = 0; i < 20; i++) {
        expect(await escrowRegistryContract.escrowsCount()).to.equal(
          BigNumber.from(0)
        );
      }
    });
  });
});
