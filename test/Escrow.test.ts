import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { ethers, getNamedAccounts, deployments } from "hardhat";
import { ERC20Mock, Escrow, EscrowRegistry } from "../typechain";
import { doubleHash, calculateEscrowCreate2Address } from "../utils/escrow";
import { BytesLike } from "@ethersproject/bytes";

describe("Escrow", function () {
  let escrowRegistryContract: EscrowRegistry;
  let erc20Mock: ERC20Mock;
  let escrowContract: Escrow;
  let deployer: string;
  let trustedForwarder: string;
  let seller: string;
  let buyer: string;
  let arbitrator: string;
  let trustedForwarderSigner: SignerWithAddress;
  let salt: string;
  let id: BigNumber;
  const amount = 1000000;
  const sellerSecrets: [BytesLike, BytesLike] = [
    doubleHash("sellerSecret1"),
    doubleHash("sellerSecret2"),
  ];
  const buyerSecrets: [BytesLike, BytesLike] = [
    doubleHash("buyerSecret1"),
    doubleHash("buyerSecret2"),
  ];
  const arbitratorSecrets: [BytesLike, BytesLike] = [
    doubleHash("arbitratorSecret1"),
    doubleHash("arbitratorSecret2"),
  ];

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

    // Create and get an escrow contract
    id = await escrowRegistryContract.escrowsCount();
    salt = ethers.utils.id(id + seller + buyer);
    await escrowRegistryContract.createEscrow(
      erc20Mock.address,
      amount,
      seller,
      buyer,
      sellerSecrets,
      buyerSecrets,
      arbitratorSecrets,
      salt
    );
    escrowContract = await ethers.getContractAt(
      "Escrow",
      await escrowRegistryContract.escrows(id)
    );
  });

  describe("Deploying", () => {
    it("Should set the trusted forwarder", async function () {
      expect(await escrowContract.trustedForwarder()).to.equal(
        trustedForwarder
      );

      //const setGreetingTx = await greeter.setGreeting("Hola, mundo!");
      // wait until the transaction is mined
      //await setGreetingTx.wait();
    });
  });
});
