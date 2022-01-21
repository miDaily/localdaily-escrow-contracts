//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./interfaces/IEscrowRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";

contract Escrow is Multicall, BaseRelayRecipient {
  uint256 private constant VOTING_TRESHOLD = 2;

  IEscrowRegistry private registry;
  uint256 public registryId;
  IERC20 public token;
  address public seller;
  address public buyer;
  uint256 public amount;
  // TODO: Make sure the secrets have been salted, have considerate minimum lengths and the offer is cancelled after some time
  mapping(bytes32 => address) public secretToAddress;
  mapping(address => uint256) public toAddressVotes;
  string public override versionRecipient = "1.0.0";

  event SecretRevealedToReleaseTo(address indexed to);
  event TokensReleased(IERC20 token, address indexed to, uint256 amount);

  constructor(
    address _trustedForwarder,
    IEscrowRegistry _registry,
    uint256 _registryId,
    IERC20 _token,
    uint256 _amount,
    address _seller,
    address _buyer,
    bytes32[2] memory _secretsOfSeller,
    bytes32[2] memory _secretsOfBuyer,
    bytes32[2] memory _secretsOfArbitrator
  ) {
    _setTrustedForwarder(_trustedForwarder);
    registry = _registry;
    registryId = _registryId;
    token = _token;
    seller = _seller;
    buyer = _buyer;
    amount = _amount;
    secretToAddress[_secretsOfSeller[0]] = _seller;
    secretToAddress[_secretsOfSeller[1]] = _buyer;
    secretToAddress[_secretsOfBuyer[0]] = _seller;
    secretToAddress[_secretsOfBuyer[1]] = _buyer;
    secretToAddress[_secretsOfArbitrator[0]] = _seller;
    secretToAddress[_secretsOfArbitrator[1]] = _buyer;
  }

  function revealSecretToReleaseTo(bytes32 oneTimeHashedSecret) public {
    // Check if the secret was registered with an address to release to
    address toAddress = secretToAddress[
      keccak256(abi.encode(oneTimeHashedSecret))
    ];
    require(toAddress != address(0), "Wrong secret");

    emit SecretRevealedToReleaseTo(toAddress);

    // Increment and check the votes to release to this address
    if (++toAddressVotes[toAddress] >= VOTING_TRESHOLD) {
      _releaseTokens(toAddress);
      _closeEscrow();
    }
  }

  function _releaseTokens(address to) internal {
    token.transfer(to, amount);
    // Send exceeding tokens to registry
    uint256 remainingBalance = token.balanceOf(address(this));
    if (remainingBalance > 0) {
      token.transfer(address(registry), remainingBalance);
    }
    emit TokensReleased(token, to, amount);
  }

  function _closeEscrow() internal {
    registry.closeEscrow(registryId);

    // Send received Matic to registry
    selfdestruct(payable(address(registry)));
  }
}
