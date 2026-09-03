// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {KoloRegistry} from "./KoloRegistry.sol";

/// @title KoloPay
/// @notice Payment router for Kolo. Every payment flows through here rather
///         than through raw ERC-20 transfers so that a single `Sent` event
///         carries everything the activity feed needs (both handles, the memo)
///         and so later phases -- claim links, ajo circles, streaming pots --
///         extend one contract with one event stream to index.
contract KoloPay {
    using SafeERC20 for IERC20;

    /// @notice No account has claimed the recipient handle.
    error HandleNotFound();
    /// @notice Payments must move a non-zero amount.
    error AmountZero();
    /// @notice Token address must be non-zero.
    error InvalidToken();
    /// @notice Sender and recipient resolve to the same account.
    error SelfSend();
    /// @notice Memo exceeds MAX_MEMO_BYTES.
    error MemoTooLong();

    /// @notice Cap on memo size, to bound event payloads.
    uint256 public constant MAX_MEMO_BYTES = 200;

    /// @notice Handle registry used to resolve recipients.
    KoloRegistry public immutable registry;

    /// @dev `fromHandle` is "" when an unregistered account sends.
    event Sent(
        address indexed from,
        address indexed to,
        string fromHandle,
        string toHandle,
        address token,
        uint256 amount,
        string memo
    );

    constructor(KoloRegistry registry_) {
        registry = registry_;
    }

    /// @notice Send `amount` of `token` to whoever owns `handle`.
    /// @dev Caller must have approved this contract for `amount`. Smart
    ///      accounts batch that approval with this call in one user operation.
    function sendToHandle(string calldata handle, address token, uint256 amount, string calldata memo) external {
        if (amount == 0) revert AmountZero();
        if (token == address(0)) revert InvalidToken();
        if (bytes(memo).length > MAX_MEMO_BYTES) revert MemoTooLong();

        address to = registry.resolve(handle);
        if (to == address(0)) revert HandleNotFound();
        if (to == msg.sender) revert SelfSend();

        IERC20(token).safeTransferFrom(msg.sender, to, amount);

        emit Sent(msg.sender, to, registry.handleOf(msg.sender), handle, token, amount, memo);
    }
}
