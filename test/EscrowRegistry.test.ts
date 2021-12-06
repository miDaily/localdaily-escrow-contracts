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

  describe("deploy", () => {
    it("Should be deployed with the trusted forwarder set", async function () {
      expect(await escrowRegistryContract.trustedForwarder()).to.equal(
        trustedForwarder
      );

      //const setGreetingTx = await greeter.setGreeting("Hola, mundo!");
      // wait until the transaction is mined
      //await setGreetingTx.wait();
    });
  });
});
