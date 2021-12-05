//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./interfaces/IEscrowRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";

contract Escrow is Multicall, BaseRelayRecipient {
  struct Secret {
    bytes32 doubleHashedSecret;
    bool isRevealed;
  }

  uint256 private constant VOTING_TRESHOLD = 2;

  IEscrowRegistry private registry;
  // TODO: Make sure the secrets have been salted, have considerate minimum lengths and the offer is cancelled after some time
  Secret[3] private secrets; // 0: Seller, 1: Buyer, 2: Arbitrator
  uint256 public registryId;
  IERC20 public token;
  uint256 public amount;
  address[2] public toAddresses; // 0: Seller, 1: Buyer
  uint256[2] public toAddressVotes; // 0: Seller, 1: Buyer
  string public override versionRecipient = "1.0.0";

  event SecretRevealedToReleaseTo(
    IEscrowRegistry.Parties from,
    IEscrowRegistry.Parties to
  );
  event TokensReleased(IERC20 token, address to, uint256 amount);

  modifier onlyToSellerOrBuyer(IEscrowRegistry.Parties to) {
    require(
      to == IEscrowRegistry.Parties.Seller ||
        to == IEscrowRegistry.Parties.Buyer,
      "Not to seller or buyer"
    );
    _;
  }

  modifier onlyRevealingSecret(
    bytes32 oneTimeHashedSecret,
    IEscrowRegistry.Parties secretFrom
  ) {
    Secret storage secret = secrets[uint256(secretFrom)];
    require(!secret.isRevealed, "Secret was already revealed");
    require(
      secret.doubleHashedSecret ==
        keccak256(abi.encodePacked(oneTimeHashedSecret)),
      "Not the right secret"
    );
    secret.isRevealed = true;
    _;
  }

  constructor(
    address _trustedForwarder,
    IEscrowRegistry _registry,
    uint256 _registryId,
    IERC20 _token,
    uint256 _amount,
    address _seller,
    address _buyer,
    bytes32 _secretOfSeller,
    bytes32 _secretOfBuyer,
    bytes32 _secretOfArbitrator
  ) {
    _setTrustedForwarder(_trustedForwarder);
    registry = _registry;
    registryId = _registryId;
    token = _token;
    amount = _amount;
    toAddresses = [_seller, _buyer]; // 0: Seller, 1: Buyer
    secrets[uint256(IEscrowRegistry.Parties.Seller)] = Secret({
      doubleHashedSecret: _secretOfSeller,
      isRevealed: false
    });
    secrets[uint256(IEscrowRegistry.Parties.Buyer)] = Secret({
      doubleHashedSecret: _secretOfBuyer,
      isRevealed: false
    });
    secrets[uint256(IEscrowRegistry.Parties.Arbitrator)] = Secret({
      doubleHashedSecret: _secretOfArbitrator,
      isRevealed: false
    });
  }

  function revealSecretToReleaseTo(
    bytes32 oneTimeHashedSecret,
    IEscrowRegistry.Parties secretFrom,
    IEscrowRegistry.Parties toParty
  )
    public
    onlyToSellerOrBuyer(toParty)
    onlyRevealingSecret(oneTimeHashedSecret, secretFrom)
  {
    emit SecretRevealedToReleaseTo(secretFrom, toParty);
    if (++toAddressVotes[uint256(toParty)] >= VOTING_TRESHOLD) {
      _releaseTokens(toAddresses[uint256(toParty)]);
      _closeEscrow();
    }
  }

  function _releaseTokens(address to) internal {
    token.transfer(to, amount);
    // Return tokens if more was sent accidentally
    uint256 remainingBalance = token.balanceOf(address(this));
    if (remainingBalance > 0) {
      token.transfer(
        toAddresses[uint256(IEscrowRegistry.Parties.Seller)],
        remainingBalance
      );
    }
    emit TokensReleased(token, to, amount);
  }

  function _closeEscrow() internal {
    registry.closeEscrow(registryId);

    // The only actor that should send funds to this contract
    // and so that could make the mistake of sending Matic instead of the token is the seller.
    // Therefore the seller's address is passed to the selfdestruct function.
    selfdestruct(payable(toAddresses[uint256(IEscrowRegistry.Parties.Seller)]));
  }
}
