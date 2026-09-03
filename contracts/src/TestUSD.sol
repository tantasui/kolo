// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title TestUSD
/// @notice Stand-in dollar balance for the Kolo demo. Six decimals so it
///         lines up with real dollar stablecoins (swapped for Agora AUSD later).
/// @dev The faucet is open to anyone, rate limited per address. Testnet only.
contract TestUSD is ERC20 {
    /// @notice Caller drew from the faucet too recently.
    error FaucetCooldown(uint256 availableAt);

    /// @notice 100 tUSD, in 6-decimal units.
    uint256 public constant FAUCET_AMOUNT = 100e6;
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    /// @notice Timestamp of each address's last faucet draw (0 = never).
    mapping(address => uint256) public lastFaucetAt;

    event FaucetDrawn(address indexed account, uint256 amount);

    constructor() ERC20("Test USD", "tUSD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint FAUCET_AMOUNT to the caller, at most once per hour.
    function faucet() external {
        uint256 last = lastFaucetAt[msg.sender];
        if (last != 0 && block.timestamp < last + FAUCET_COOLDOWN) {
            revert FaucetCooldown(last + FAUCET_COOLDOWN);
        }

        lastFaucetAt[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetDrawn(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Seconds until `account` may draw again (0 if available now).
    function faucetCooldownRemaining(address account) external view returns (uint256) {
        uint256 last = lastFaucetAt[account];
        if (last == 0) return 0;
        uint256 readyAt = last + FAUCET_COOLDOWN;
        return block.timestamp >= readyAt ? 0 : readyAt - block.timestamp;
    }
}
