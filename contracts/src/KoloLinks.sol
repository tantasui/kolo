// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {KoloRegistry} from "./KoloRegistry.sol";

/// @title KoloLinks
/// @notice Money parked against a secret, so it can be sent to someone who has
///         no handle yet -- the Kolo answer to "I don't know their handle, I'll
///         just send them a link".
///
/// @dev The sender's device generates 32 random bytes, keeps them in the URL
///      fragment (which browsers never send to a server) and puts only
///      `keccak256(secret)` on chain. Whoever opens the link holds the preimage
///      and can claim.
///
///      **Front-running is possible by design.** `claim` reveals the preimage in
///      calldata, so an observer could copy it and race the claimer with their
///      own recipient. This is the standard hash-preimage link, and it is
///      accepted here because Kolo is a testnet demo. The upgrade is to treat
///      the secret as an ECDSA private key and have the claimant sign their own
///      recipient address, which binds the claim to them and makes the race
///      useless; that changes only this contract and the claim call.
///
///      Funds are never trapped: the sender can `reclaim` any unclaimed link.
contract KoloLinks {
    using SafeERC20 for IERC20;

    /// @notice A live link already uses this secret hash.
    error LinkExists();
    /// @notice No live link for that secret.
    error LinkNotFound();
    /// @notice Links must carry a non-zero amount.
    error AmountZero();
    /// @notice Token address must be non-zero.
    error InvalidToken();
    /// @notice Memo exceeds MAX_MEMO_BYTES.
    error MemoTooLong();
    /// @notice Only the account that created a link may reclaim it.
    error NotSender();
    /// @notice The link's claim window has closed; only the sender can recover it.
    error LinkExpired();
    /// @notice Recipient must be a real address.
    error ZeroRecipient();
    /// @notice Secret hash must be non-zero.
    error InvalidSecretHash();

    /// @notice Cap on memo size, mirroring KoloPay.
    uint256 public constant MAX_MEMO_BYTES = 200;

    /// @notice How long a link stays claimable.
    /// @dev Fixed rather than per-link: the sender is choosing how to pay
    ///      someone, not configuring an escrow, and one number keeps the copy
    ///      honest ("expires in 7 days") without another decision in the flow.
    ///      Expiry never destroys money -- it only closes claiming, after which
    ///      `reclaim` is the sender's way to take it back.
    uint256 public constant LINK_LIFETIME = 7 days;

    struct Link {
        address sender;
        address token;
        uint256 amount;
        uint64 createdAt;
        /// @dev Claiming is refused from this timestamp on.
        uint64 expiresAt;
    }

    /// @notice Handle registry, used to stamp the sender's handle on the event.
    KoloRegistry public immutable registry;

    /// @dev keccak256(secret) => the money waiting behind it.
    ///      `amount == 0` means "no live link", so claiming and reclaiming both
    ///      delete the row and free the hash.
    mapping(bytes32 => Link) internal _links;

    event LinkCreated(
        bytes32 indexed secretHash,
        address indexed sender,
        string senderHandle,
        address token,
        uint256 amount,
        string memo,
        uint64 expiresAt
    );
    event LinkClaimed(bytes32 indexed secretHash, address indexed recipient, address token, uint256 amount);
    /// @dev `afterExpiry` separates a sender cancelling a live link from one
    ///      sweeping up a link nobody claimed. The feed words those differently.
    event LinkReclaimed(bytes32 indexed secretHash, address indexed sender, uint256 amount, bool afterExpiry);

    constructor(KoloRegistry registry_) {
        registry = registry_;
    }

    /// @notice Park `amount` behind `secretHash`.
    /// @dev Caller must have approved this contract. Smart accounts batch that
    ///      approval with this call in one sponsored user operation.
    function create(bytes32 secretHash, address token, uint256 amount, string calldata memo) external {
        // No secret hashes to zero, so a client that forgot to generate one
        // cannot park money behind a hash that nothing can ever claim.
        if (secretHash == bytes32(0)) revert InvalidSecretHash();
        if (amount == 0) revert AmountZero();
        if (token == address(0)) revert InvalidToken();
        if (bytes(memo).length > MAX_MEMO_BYTES) revert MemoTooLong();
        if (_links[secretHash].amount != 0) revert LinkExists();

        uint64 expiresAt = uint64(block.timestamp + LINK_LIFETIME);

        _links[secretHash] = Link({
            sender: msg.sender, token: token, amount: amount, createdAt: uint64(block.timestamp), expiresAt: expiresAt
        });

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit LinkCreated(secretHash, msg.sender, registry.handleOf(msg.sender), token, amount, memo, expiresAt);
    }

    /// @notice Hand a link's money to `recipient`, proving the secret.
    /// @dev Anyone may submit on the recipient's behalf, so a fresh account can
    ///      be paid without first holding gas.
    function claim(bytes32 secret, address recipient) external {
        if (recipient == address(0)) revert ZeroRecipient();

        bytes32 secretHash = keccak256(abi.encodePacked(secret));
        Link memory link = _links[secretHash];
        if (link.amount == 0) revert LinkNotFound();
        if (block.timestamp >= link.expiresAt) revert LinkExpired();

        // Cleared before the transfer: claiming twice is impossible even if the
        // token calls back into this contract.
        delete _links[secretHash];

        IERC20(link.token).safeTransfer(recipient, link.amount);

        emit LinkClaimed(secretHash, recipient, link.token, link.amount);
    }

    /// @notice Take back an unclaimed link. Only the account that created it.
    /// @dev Allowed at any time, before or after expiry: cancelling a link you
    ///      just sent and sweeping up one nobody claimed are the same operation.
    function reclaim(bytes32 secretHash) external {
        Link memory link = _links[secretHash];
        if (link.amount == 0) revert LinkNotFound();
        if (link.sender != msg.sender) revert NotSender();

        delete _links[secretHash];

        IERC20(link.token).safeTransfer(link.sender, link.amount);

        emit LinkReclaimed(secretHash, link.sender, link.amount, block.timestamp >= link.expiresAt);
    }

    /// @notice The link behind `secretHash`, or a zeroed struct if none.
    function linkOf(bytes32 secretHash) external view returns (Link memory) {
        return _links[secretHash];
    }

    /// @notice True while a link exists -- claimed or reclaimed clears it.
    ///         An expired link is still live: its money is still there, waiting
    ///         for the sender to reclaim it.
    function isLive(bytes32 secretHash) external view returns (bool) {
        return _links[secretHash].amount != 0;
    }

    /// @notice True when a live link can still be claimed by a recipient.
    function isClaimable(bytes32 secretHash) external view returns (bool) {
        Link memory link = _links[secretHash];
        return link.amount != 0 && block.timestamp < link.expiresAt;
    }

    /// @notice The hash a given secret parks money behind. Lets a client check
    ///         its own hashing against the chain's before it spends anything.
    function hashOf(bytes32 secret) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(secret));
    }
}
