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
  const sellerSecret0 = "sellerSecretToReleaseToSeller";
  const sellerSecret1 = "sellerSecretToReleaseToBuyer";
  const sellerSecrets: [BytesLike, BytesLike] = [
    doubleHash(sellerSecret0),
    doubleHash(sellerSecret1),
  ];
  const buyerSecret0 = "buyerSecretToReleaseToSeller";
  const buyerSecret1 = "buyerSecretToReleaseToBuyer";
  const buyerSecrets: [BytesLike, BytesLike] = [
    doubleHash(buyerSecret0),
    doubleHash(buyerSecret1),
  ];
  const arbitratorSecret0 = "arbitratorSecretToReleaseToSeller";
  const arbitratorSecret1 = "arbitratorSecretToReleaseToBuyer";
  const arbitratorSecrets: [BytesLike, BytesLike] = [
    doubleHash(arbitratorSecret0),
    doubleHash(arbitratorSecret1),
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
    // Mint the token amount into the escrow contract
    await erc20Mock.mint(escrowContract.address, amount);
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

    it("Should set all contract parameters correctly", async function () {
      expect(await escrowContract.registryId()).to.equal(id);
      expect(await escrowContract.token()).to.equal(erc20Mock.address);
      expect(await escrowContract.seller()).to.equal(seller);
      expect(await escrowContract.buyer()).to.equal(buyer);
      expect(await escrowContract.amount()).to.equal(amount);
      expect(await escrowContract.secretToAddress(sellerSecrets[0])).to.equal(
        seller
      );
      expect(await escrowContract.secretToAddress(sellerSecrets[1])).to.equal(
        buyer
      );
      expect(await escrowContract.secretToAddress(buyerSecrets[0])).to.equal(
        seller
      );
      expect(await escrowContract.secretToAddress(buyerSecrets[1])).to.equal(
        buyer
      );
      expect(
        await escrowContract.secretToAddress(arbitratorSecrets[0])
      ).to.equal(seller);
      expect(
        await escrowContract.secretToAddress(arbitratorSecrets[1])
      ).to.equal(buyer);
      expect(await escrowContract.toAddressVotes(seller)).to.equal(0);
      expect(await escrowContract.toAddressVotes(buyer)).to.equal(0);
    });
  });

  describe("Revealing a secret", () => {
    it("Should give an error if you don't share a correct secret", async function () {
      await expect(
        escrowContract.revealSecretToReleaseTo(ethers.utils.id("wrong secret"))
      ).to.be.revertedWith("Wrong secret");
    });

    it("Should emit an event with the seller as toAddress parameter if the seller shares its first secret", async function () {
      await expect(
        escrowContract.revealSecretToReleaseTo(ethers.utils.id(sellerSecret0))
      )
        .to.emit(escrowContract, "SecretRevealedToReleaseTo")
        .withArgs(seller);
    });

    it("Should emit an event with the buyer as toAddress parameter if the seller shares its second secret", async function () {
      await expect(
        escrowContract.revealSecretToReleaseTo(ethers.utils.id(sellerSecret1))
      )
        .to.emit(escrowContract, "SecretRevealedToReleaseTo")
        .withArgs(buyer);
    });

    it("Should emit an event with the seller as toAddress parameter if the buyer shares its first secret", async function () {
      await expect(
        escrowContract.revealSecretToReleaseTo(ethers.utils.id(buyerSecret0))
      )
        .to.emit(escrowContract, "SecretRevealedToReleaseTo")
        .withArgs(seller);
    });

    it("Should emit an event with the buyer as toAddress parameter if the buyer shares its second secret", async function () {
      await expect(
        escrowContract.revealSecretToReleaseTo(ethers.utils.id(buyerSecret1))
      )
        .to.emit(escrowContract, "SecretRevealedToReleaseTo")
        .withArgs(buyer);
    });

    it("Should emit an event with the seller as toAddress parameter if the arbitrator shares its first secret", async function () {
      await expect(
        escrowContract.revealSecretToReleaseTo(
          ethers.utils.id(arbitratorSecret0)
        )
      )
        .to.emit(escrowContract, "SecretRevealedToReleaseTo")
        .withArgs(seller);
    });

    it("Should emit an event with the buyer as toAddress parameter if the arbitrator shares its second secret", async function () {
      await expect(
        escrowContract.revealSecretToReleaseTo(
          ethers.utils.id(arbitratorSecret1)
        )
      )
        .to.emit(escrowContract, "SecretRevealedToReleaseTo")
        .withArgs(buyer);
    });

    it("Should add a vote to release to the seller if the seller shares its first secret", async function () {
      await escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(sellerSecret0)
      );
      expect(await escrowContract.toAddressVotes(seller)).to.equal(1);
      expect(await escrowContract.toAddressVotes(buyer)).to.equal(0);
    });

    it("Should add a vote to release to the buyer if the seller shares its second secret", async function () {
      await escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(sellerSecret1)
      );
      expect(await escrowContract.toAddressVotes(buyer)).to.equal(1);
      expect(await escrowContract.toAddressVotes(seller)).to.equal(0);
    });

    it("Should add a vote to release to the seller if the buyer shares its first secret", async function () {
      await escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(buyerSecret0)
      );
      expect(await escrowContract.toAddressVotes(seller)).to.equal(1);
      expect(await escrowContract.toAddressVotes(buyer)).to.equal(0);
    });

    it("Should add a vote to release to the buyer if the buyer shares its second secret", async function () {
      await escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(buyerSecret1)
      );
      expect(await escrowContract.toAddressVotes(buyer)).to.equal(1);
      expect(await escrowContract.toAddressVotes(seller)).to.equal(0);
    });
  });

  describe("Seller and buyer agree", () => {
    it("Should release the escrow funds back to the seller if payment was not made by buyer", async function () {
      const balanceBefore = await erc20Mock.balanceOf(seller);

      await escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(sellerSecret0)
      );
      const releasingTx = escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(buyerSecret0)
      );
      await releasingTx;

      // Seller should have received the funds from the escrow
      expect(await erc20Mock.balanceOf(seller)).to.equal(
        balanceBefore.add(amount)
      );
      // The escrow contract should have self-destructed
      expect(
        await escrowContract.provider.getCode(escrowContract.address)
      ).to.equal("0x");
      // The correct events should have been emitted
      expect(releasingTx)
        .to.emit(escrowContract, "TokensReleased")
        .withArgs(erc20Mock.address, seller, amount);
      expect(releasingTx)
        .to.emit(escrowRegistryContract, "EscrowClosed")
        .withArgs(
          id,
          escrowContract.address,
          erc20Mock.address,
          seller,
          buyer,
          amount
        );
    });

    it("Should release the escrow funds to the buyer if seller confirms buyer's payment", async function () {
      const balanceBefore = await erc20Mock.balanceOf(buyer);

      await escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(sellerSecret1)
      );
      const releasingTx = escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(buyerSecret1)
      );
      await releasingTx;

      // Buyer should have received the funds from the escrow
      expect(await erc20Mock.balanceOf(buyer)).to.equal(
        balanceBefore.add(amount)
      );
      // The escrow contract should have self-destructed
      expect(
        await escrowContract.provider.getCode(escrowContract.address)
      ).to.equal("0x");
      // The correct events should have been emitted
      expect(releasingTx)
        .to.emit(escrowContract, "TokensReleased")
        .withArgs(erc20Mock.address, buyer, amount);
      expect(releasingTx)
        .to.emit(escrowRegistryContract, "EscrowClosed")
        .withArgs(
          id,
          escrowContract.address,
          erc20Mock.address,
          seller,
          buyer,
          amount
        );
    });
  });

  describe("Seller and buyer disagree", () => {
    beforeEach(async () => {
      await escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(sellerSecret0)
      );
      await escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(buyerSecret1)
      );
    });

    it("Should give one vote to each", async function () {
      expect(await escrowContract.toAddressVotes(seller)).to.equal(1);
      expect(await escrowContract.toAddressVotes(buyer)).to.equal(1);
    });

    it("Should be resolved by arbitrator who can release funds back to seller", async function () {
      const balanceBefore = await erc20Mock.balanceOf(seller);

      const releasingTx = escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(arbitratorSecret0)
      );
      await releasingTx;

      // Seller should have received the funds from the escrow
      expect(await erc20Mock.balanceOf(seller)).to.equal(
        balanceBefore.add(amount)
      );
      // The escrow contract should have self-destructed
      expect(
        await escrowContract.provider.getCode(escrowContract.address)
      ).to.equal("0x");
      // The correct events should have been emitted
      expect(releasingTx)
        .to.emit(escrowContract, "TokensReleased")
        .withArgs(erc20Mock.address, seller, amount);
      expect(releasingTx)
        .to.emit(escrowRegistryContract, "EscrowClosed")
        .withArgs(
          id,
          escrowContract.address,
          erc20Mock.address,
          seller,
          buyer,
          amount
        );
    });

    it("Should be resolved by arbitrator who can release funds to buyer", async function () {
      const balanceBefore = await erc20Mock.balanceOf(buyer);

      const releasingTx = escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(arbitratorSecret1)
      );
      await releasingTx;

      // Buyer should have received the funds from the escrow
      expect(await erc20Mock.balanceOf(buyer)).to.equal(
        balanceBefore.add(amount)
      );
      // The escrow contract should have self-destructed
      expect(
        await escrowContract.provider.getCode(escrowContract.address)
      ).to.equal("0x");
      // The correct events should have been emitted
      expect(releasingTx)
        .to.emit(escrowContract, "TokensReleased")
        .withArgs(erc20Mock.address, buyer, amount);
      expect(releasingTx)
        .to.emit(escrowRegistryContract, "EscrowClosed")
        .withArgs(
          id,
          escrowContract.address,
          erc20Mock.address,
          seller,
          buyer,
          amount
        );
    });
  });

  describe("Too much tokens were sent to the escrow", () => {
    const excessAmountTokens = 450000;

    beforeEach(async () => {
      // Mint the excess token amount into the escrow contract
      await erc20Mock.mint(escrowContract.address, excessAmountTokens);
    });

    it("Should send the excess tokens to the registry on escrow resolution", async function () {
      const balanceBefore = await erc20Mock.balanceOf(
        escrowRegistryContract.address
      );

      await escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(sellerSecret1)
      );
      await escrowContract.revealSecretToReleaseTo(
        ethers.utils.id(buyerSecret1)
      );

      // Registry should have received the excess of tokens from the escrow
      expect(
        await erc20Mock.balanceOf(escrowRegistryContract.address)
      ).to.equal(balanceBefore.add(excessAmountTokens));
    });
  });
});
