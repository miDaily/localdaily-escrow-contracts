// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEscrowRegistry {
  enum Parties {
    Seller,
    Buyer,
    Arbitrator
  }

  function closeEscrow(uint256 id) external;
}
