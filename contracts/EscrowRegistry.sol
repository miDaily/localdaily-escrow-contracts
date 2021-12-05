//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./interfaces/IEscrowRegistry.sol";
import "./Escrow.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";

contract EscrowRegistry is BaseRelayRecipient, Multicall, IEscrowRegistry {
  using Counters for Counters.Counter;

  mapping(uint256 => Escrow) public escrows;
  Counters.Counter public escrowsCount;
  uint256[] public closedEscrows;
  string public override versionRecipient = "1.0.0";

  event EscrowCreated(
    uint256 id,
    Escrow escrow,
    IERC20 indexed token,
    address indexed seller,
    address indexed buyer,
    uint256 amount
  );
  event EscrowClosed(
    uint256 id,
    Escrow escrow,
    IERC20 indexed token,
    address indexed seller,
    address indexed buyer,
    uint256 amount
  );

  constructor(address _trustedForwarder) {
    _setTrustedForwarder(_trustedForwarder);
  }

  function createEscrow(
    IERC20 token,
    uint256 amount,
    address seller,
    address buyer,
    bytes32 doubleHashedSecretOfSeller,
    bytes32 doubleHashedSecretOfBuyer,
    bytes32 doubleHashedSecretOfThirdParty
  ) public returns (Escrow escrow) {
    uint256 id = escrowsCount.current();
    escrowsCount.increment();

    escrow = new Escrow(
      trustedForwarder(),
      this,
      id,
      token,
      amount,
      seller,
      buyer,
      doubleHashedSecretOfSeller,
      doubleHashedSecretOfBuyer,
      doubleHashedSecretOfThirdParty
    ); // TODO: use a salt for contract creation so the frontend can predict the contract address without waiting for the event: https://docs.soliditylang.org/en/v0.8.10/control-structures.html?highlight=for#salted-contract-creations-create2

    escrows[id] = escrow;
    emit EscrowCreated(id, escrow, token, seller, buyer, amount);
  }

  function closeEscrow(uint256 id) external override {
    Escrow escrow = escrows[id];
    // Require it to be called from the escrow contract
    require(msg.sender == address(escrow), "Not called by escrow contract");
    closedEscrows.push(id);

    emit EscrowClosed(
      id,
      escrow,
      escrow.token(),
      escrow.toAddresses(uint256(IEscrowRegistry.Parties.Seller)),
      escrow.toAddresses(uint256(IEscrowRegistry.Parties.Buyer)),
      escrow.amount()
    );
  }
}