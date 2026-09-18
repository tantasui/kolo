// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title KoloGoals
/// @notice Money set aside toward something, out of the spending balance.
///
/// @dev **What a goal is for.** Nothing here guarantees anything against the
///      owner, because there is nobody else involved: one person saves toward
///      their own target. The value is separation -- money that has been put
///      toward "New laptop" is no longer sitting in the balance being spent
///      from. That is the whole product, and it needs very little contract.
///
///      **No lock, on purpose.** An owner can withdraw any amount at any time,
///      before or after the target, with no penalty. An app whose promise is
///      "your money is always yours" should not hold money against the will of
///      the person it belongs to. The target date is a note to self and is
///      never enforced.
///
///      **Only the owner puts money in.** Goals are single-player in this
///      phase, and that is enforced here rather than left to the app.
///
///      **Money only ever leaves at the owner's request**, to the owner. The
///      contract never sends anyone anything on its own initiative.
///
///      There is one token, fixed at construction, and no function takes a
///      token, so a second one cannot appear.
contract KoloGoals {
    using SafeERC20 for IERC20;

    error GoalNotFound();
    error NotOwner();
    error AmountZero();
    error TargetZero();
    error LabelTooLong();
    error NotEnoughSaved();

    /// @notice Longest a label may be.
    uint256 public constant MAX_LABEL_BYTES = 40;

    struct Goal {
        address owner;
        uint256 target;
        /// @notice What is set aside right now.
        uint256 saved;
        /// @notice A date to aim for. Never enforced; 0 means none was set.
        uint64 targetDate;
        /// @notice When `saved` first reached `target`; 0 until then.
        uint64 reachedAt;
        /// @notice Set the moment the target is first reached, and kept.
        /// @dev Written inside `contribute`, because a view cannot write. It
        ///      stays true after a withdrawal: reaching the target is something
        ///      that happened, and taking the money out afterwards -- which is
        ///      allowed and is the point -- does not undo it.
        bool reached;
        string label;
    }

    /// @notice The dollar balance goals are saved in.
    IERC20 public immutable token;

    uint256 public goalCount;

    mapping(uint256 => Goal) internal _goals;
    mapping(address => uint256[]) internal _goalsOf;

    event GoalCreated(uint256 indexed goalId, address indexed owner, string label, uint256 target, uint64 targetDate);
    event Contributed(uint256 indexed goalId, address indexed owner, uint256 amount, uint256 saved);
    event GoalReached(uint256 indexed goalId, address indexed owner, uint64 reachedAt);
    event Withdrawn(uint256 indexed goalId, address indexed owner, uint256 amount, uint256 saved);

    constructor(IERC20 token_) {
        token = token_;
    }

    /// @notice Record something to save toward. Moves no money.
    function create(string calldata label, uint256 target, uint64 targetDate) external returns (uint256 goalId) {
        if (target == 0) revert TargetZero();
        if (bytes(label).length > MAX_LABEL_BYTES) revert LabelTooLong();

        goalId = ++goalCount;

        Goal storage goal = _goals[goalId];
        goal.owner = msg.sender;
        goal.target = target;
        goal.targetDate = targetDate;
        goal.label = label;

        _goalsOf[msg.sender].push(goalId);

        emit GoalCreated(goalId, msg.sender, label, target, targetDate);
    }

    /// @notice Set `amount` aside toward the goal.
    function contribute(uint256 goalId, uint256 amount) external {
        Goal storage goal = _ownGoal(goalId);
        if (amount == 0) revert AmountZero();

        goal.saved += amount;

        if (!goal.reached && goal.saved >= goal.target) {
            goal.reached = true;
            goal.reachedAt = uint64(block.timestamp);
            emit GoalReached(goalId, msg.sender, goal.reachedAt);
        }

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit Contributed(goalId, msg.sender, amount, goal.saved);
    }

    /// @notice Take `amount` back out. Any amount, any time, no penalty.
    function withdraw(uint256 goalId, uint256 amount) external {
        Goal storage goal = _ownGoal(goalId);
        if (amount == 0) revert AmountZero();
        if (amount > goal.saved) revert NotEnoughSaved();

        goal.saved -= amount;

        token.safeTransfer(msg.sender, amount);

        emit Withdrawn(goalId, msg.sender, amount, goal.saved);
    }

    /* ---------- reading ---------- */

    function goalOf(uint256 goalId) external view returns (Goal memory) {
        return _goals[goalId];
    }

    /// @notice Every goal `owner` has made, oldest first.
    function goalIdsOf(address owner) external view returns (uint256[] memory) {
        return _goalsOf[owner];
    }

    function _ownGoal(uint256 goalId) internal view returns (Goal storage goal) {
        goal = _goals[goalId];
        if (goal.owner == address(0)) revert GoalNotFound();
        if (goal.owner != msg.sender) revert NotOwner();
    }
}
