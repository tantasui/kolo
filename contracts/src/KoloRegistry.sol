// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title KoloRegistry
/// @notice Maps human-readable handles to accounts. A handle is the only
///         identifier a Kolo user ever sees or types.
/// @dev Handles are lowercase-only by validation, so the raw keccak of the
///      string is a safe lookup key with no normalisation step.
///      Future phases (claim links, circles, pots) resolve recipients through
///      this same registry, so it deliberately holds no payment logic.
contract KoloRegistry {
    /// @notice Handle failed the character/length rules.
    error InvalidHandle();
    /// @notice Handle is already owned by another account.
    error HandleTaken();
    /// @notice Caller already owns a handle. One handle per account.
    error AlreadyRegistered();

    uint256 internal constant MIN_LENGTH = 3;
    uint256 internal constant MAX_LENGTH = 20;

    /// @dev keccak256(handle) => owner
    mapping(bytes32 => address) internal _accountOf;
    /// @dev owner => handle
    mapping(address => string) internal _handleOf;

    event HandleRegistered(address indexed account, string handle);

    /// @notice Claim `handle` for the caller.
    function register(string calldata handle) external {
        if (!_isValidHandle(handle)) revert InvalidHandle();
        if (bytes(_handleOf[msg.sender]).length != 0) revert AlreadyRegistered();

        bytes32 key = keccak256(bytes(handle));
        if (_accountOf[key] != address(0)) revert HandleTaken();

        _accountOf[key] = msg.sender;
        _handleOf[msg.sender] = handle;

        emit HandleRegistered(msg.sender, handle);
    }

    /// @notice Address behind `handle`, or address(0) if unclaimed.
    function resolve(string calldata handle) external view returns (address) {
        return _accountOf[keccak256(bytes(handle))];
    }

    /// @notice Handle owned by `account`, or "" if none.
    function handleOf(address account) external view returns (string memory) {
        return _handleOf[account];
    }

    /// @notice True only if `handle` is both well-formed and unclaimed.
    function isAvailable(string calldata handle) external view returns (bool) {
        return _isValidHandle(handle) && _accountOf[keccak256(bytes(handle))] == address(0);
    }

    /// @notice Character/length validation, exposed so clients can tell
    ///         "badly formed" apart from "already taken".
    function isValidHandle(string calldata handle) external pure returns (bool) {
        return _isValidHandle(handle);
    }

    /// @dev 3-20 chars, each of a-z, 0-9 or underscore.
    function _isValidHandle(string calldata handle) internal pure returns (bool) {
        bytes calldata b = bytes(handle);
        if (b.length < MIN_LENGTH || b.length > MAX_LENGTH) return false;

        for (uint256 i; i < b.length; ++i) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7a) // a-z
                || (c >= 0x30 && c <= 0x39) // 0-9
                || c == 0x5f; // _
            if (!ok) return false;
        }
        return true;
    }
}
