// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title KoloFaucet
/// @notice Hands demo users a sensible opening balance of a token we do not
///         control the supply of.
/// @dev Agora's own AUSD faucet pays 10,000 AUSD per request, which reads as
///      absurd in a consumer money app (~N16m at the demo rate). We top this
///      contract up from that faucet and dispense a normal-looking amount.
///
///      `drip` pays the `recipient` argument rather than `msg.sender`, so a
///      smart account can fund itself in a single sponsored call with no
///      relayer -- the same shape as Agora's `requestFunds(address)`.
///
///      Anyone may call `drip` for anyone. On a testnet demo that is the point;
///      it does mean a griefer could burn another address's cooldown, which we
///      accept here rather than adding signature checks.
contract KoloFaucet {
    using SafeERC20 for IERC20;

    /// @notice `recipient` drew from the faucet too recently.
    error CooldownActive(uint256 availableAt);
    /// @notice The faucet's reserve is below one drip; it needs topping up.
    error FaucetEmpty();
    /// @notice Caller is not the owner.
    error NotOwner();
    /// @notice Recipient must be a real address.
    error ZeroRecipient();
    /// @notice Owner cannot be the zero address.
    error ZeroOwner();

    /// @notice The token handed out. Immutable: a new token means a new faucet.
    IERC20 public immutable token;
    /// @notice Amount per drip, in the token's own units.
    uint256 public immutable dripAmount;
    /// @notice Minimum gap between drips to the same recipient.
    uint256 public immutable cooldown;

    /// @notice May top up, withdraw, and hand over ownership.
    address public owner;

    /// @notice Timestamp of each recipient's last drip (0 = never).
    mapping(address => uint256) public lastDripAt;

    event Dripped(address indexed recipient, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IERC20 token_, uint256 dripAmount_, uint256 cooldown_) {
        token = token_;
        dripAmount = dripAmount_;
        cooldown = cooldown_;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Send one drip to `recipient`, subject to their cooldown.
    function drip(address recipient) external {
        if (recipient == address(0)) revert ZeroRecipient();

        uint256 last = lastDripAt[recipient];
        if (last != 0 && block.timestamp < last + cooldown) {
            revert CooldownActive(last + cooldown);
        }
        if (token.balanceOf(address(this)) < dripAmount) revert FaucetEmpty();

        lastDripAt[recipient] = block.timestamp;
        token.safeTransfer(recipient, dripAmount);

        emit Dripped(recipient, dripAmount);
    }

    /// @notice Seconds until `recipient` may draw again (0 if available now).
    function cooldownRemaining(address recipient) external view returns (uint256) {
        uint256 last = lastDripAt[recipient];
        if (last == 0) return 0;
        uint256 readyAt = last + cooldown;
        return block.timestamp >= readyAt ? 0 : readyAt - block.timestamp;
    }

    /// @notice How many drips the reserve can still cover.
    function dripsRemaining() external view returns (uint256) {
        return token.balanceOf(address(this)) / dripAmount;
    }

    /// @notice Recover the reserve. Top-ups are plain transfers in.
    function withdraw(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroRecipient();
        token.safeTransfer(to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroOwner();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
