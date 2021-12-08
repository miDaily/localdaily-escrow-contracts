import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { ethers, getNamedAccounts, deployments } from "hardhat";
import { ERC20Mock, Escrow, EscrowRegistry } from "../typechain";
import { doubleHash, calculateEscrowCreate2Address } from "../utils/escrow";

describe("EscrowRegistry", function () {
  let escrowRegistryContract: EscrowRegistry;
  let erc20Mock: ERC20Mock;
  let deployer: string;
  let trustedForwarder: string;
  let seller: string;
  let buyer: string;
  let arbitrator: string;
  let trustedForwarderSigner: SignerWithAddress;

  before(async () => {
    // Get the accounts
    const accounts = await getNamedAccounts();
    deployer = accounts["deployer"];
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
      for (let i = 0; i < testIterations; i++) {
        await escrowRegistryContract.createEscrow(
          erc20Mock.address,
          100,
          seller,
          buyer,
          [doubleHash("sellerSecret1"), doubleHash("sellerSecret2")],
          [doubleHash("buyerSecret1"), doubleHash("buyerSecret2")],
          [doubleHash("arbitratorSecret1"), doubleHash("arbitratorSecret2")],
          ethers.utils.id("salt")
        );
        expect(await escrowRegistryContract.escrowsCount()).to.equal(
          BigNumber.from(i + 1)
        );
      }
    });

    it("Should create and store the escrow contract with the id generated by the counter", async function () {
      const testIterations = 20;
      for (let i = 0; i < testIterations; i++) {
        const id = await escrowRegistryContract.escrowsCount();

        await escrowRegistryContract.createEscrow(
          erc20Mock.address,
          100,
          seller,
          buyer,
          [doubleHash("sellerSecret1"), doubleHash("sellerSecret2")],
          [doubleHash("buyerSecret1"), doubleHash("buyerSecret2")],
          [doubleHash("arbitratorSecret1"), doubleHash("arbitratorSecret2")],
          ethers.utils.id(id + seller + buyer)
        );

        const escrowContract: Escrow = await ethers.getContractAt(
          "Escrow",
          await escrowRegistryContract.escrows(id)
        );
        expect(await escrowContract.registryId()).to.equal(id);
      }
    });

    it("Should generate the contract with a predictable address through a salt", async function () {
      const testIterations = 20;
      const amount = 100;
      for (let i = 0; i < testIterations; i++) {
        const id = await escrowRegistryContract.escrowsCount();
        const salt = ethers.utils.id(id + seller + buyer);
        const escrowAddressPrediction = calculateEscrowCreate2Address(
          escrowRegistryContract.address,
          salt,
          trustedForwarder,
          escrowRegistryContract.address,
          id,
          erc20Mock.address,
          amount,
          seller,
          buyer,
          [doubleHash("sellerSecret1"), doubleHash("sellerSecret2")],
          [doubleHash("buyerSecret1"), doubleHash("buyerSecret2")],
          [doubleHash("arbitratorSecret1"), doubleHash("arbitratorSecret2")]
        );

        await escrowRegistryContract.createEscrow(
          erc20Mock.address,
          amount,
          seller,
          buyer,
          [doubleHash("sellerSecret1"), doubleHash("sellerSecret2")],
          [doubleHash("buyerSecret1"), doubleHash("buyerSecret2")],
          [doubleHash("arbitratorSecret1"), doubleHash("arbitratorSecret2")],
          salt
        );

        const escrowAddress = await escrowRegistryContract.escrows(id);
        expect(escrowAddress).to.equal(escrowAddressPrediction);
      }
    });

    it("Should emit an EscrowCreated event", async function () {
      const id = await escrowRegistryContract.escrowsCount();
      const amount = 100;
      const salt = ethers.utils.id(id + seller + buyer);
      const escrowAddressPrediction = calculateEscrowCreate2Address(
        escrowRegistryContract.address,
        salt,
        trustedForwarder,
        escrowRegistryContract.address,
        id,
        erc20Mock.address,
        amount,
        seller,
        buyer,
        [doubleHash("sellerSecret1"), doubleHash("sellerSecret2")],
        [doubleHash("buyerSecret1"), doubleHash("buyerSecret2")],
        [doubleHash("arbitratorSecret1"), doubleHash("arbitratorSecret2")]
      );

      const tx = escrowRegistryContract.createEscrow(
        erc20Mock.address,
        amount,
        seller,
        buyer,
        [doubleHash("sellerSecret1"), doubleHash("sellerSecret2")],
        [doubleHash("buyerSecret1"), doubleHash("buyerSecret2")],
        [doubleHash("arbitratorSecret1"), doubleHash("arbitratorSecret2")],
        salt
      );

      await expect(tx)
        .to.emit(escrowRegistryContract, "EscrowCreated")
        .withArgs(
          id,
          escrowAddressPrediction,
          erc20Mock.address,
          seller,
          buyer,
          amount
        );
    });
  });
});
