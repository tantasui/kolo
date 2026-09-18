// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {KoloGoals} from "../src/KoloGoals.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract KoloGoalsTest is Test {
    KoloGoals internal goals;
    TestUSD internal usd;

    address internal amara = makeAddr("amara");
    address internal tunde = makeAddr("tunde");

    uint256 internal constant TARGET = 200e6;
    uint64 internal constant DATE = 1_750_000_000;

    event GoalCreated(uint256 indexed goalId, address indexed owner, string label, uint256 target, uint64 targetDate);
    event Contributed(uint256 indexed goalId, address indexed owner, uint256 amount, uint256 saved);
    event GoalReached(uint256 indexed goalId, address indexed owner, uint64 reachedAt);
    event Withdrawn(uint256 indexed goalId, address indexed owner, uint256 amount, uint256 saved);

    function setUp() public {
        vm.warp(1_700_000_000);
        usd = new TestUSD();
        goals = new KoloGoals(IERC20(address(usd)));
        _stock(amara);
        _stock(tunde);
    }

    /// 500 dollars each, approved.
    function _stock(address who) internal {
        vm.startPrank(who);
        for (uint256 i; i < 5; ++i) {
            usd.faucet();
            vm.warp(block.timestamp + 1 hours);
        }
        usd.approve(address(goals), type(uint256).max);
        vm.stopPrank();
    }

    function _laptop() internal returns (uint256 id) {
        vm.prank(amara);
        id = goals.create("New laptop", TARGET, DATE);
    }

    /* ---------- creating ---------- */

    function test_CreateRecordsIntentAndMovesNoMoney() public {
        uint256 before = usd.balanceOf(amara);

        vm.expectEmit(true, true, false, true);
        emit GoalCreated(1, amara, "New laptop", TARGET, DATE);
        uint256 id = _laptop();

        KoloGoals.Goal memory goal = goals.goalOf(id);
        assertEq(goal.owner, amara);
        assertEq(goal.target, TARGET);
        assertEq(goal.saved, 0);
        assertEq(goal.targetDate, DATE);
        assertFalse(goal.reached);
        assertEq(goal.label, "New laptop");

        assertEq(usd.balanceOf(amara), before, "nothing moved");
        assertEq(usd.balanceOf(address(goals)), 0);
    }

    function test_GoalsAreListedPerOwner() public {
        uint256 a1 = _laptop();
        vm.prank(tunde);
        uint256 t1 = goals.create("Rent", 300e6, 0);
        vm.prank(amara);
        uint256 a2 = goals.create("Holiday", 150e6, 0);

        uint256[] memory hers = goals.goalIdsOf(amara);
        assertEq(hers.length, 2);
        assertEq(hers[0], a1);
        assertEq(hers[1], a2);

        uint256[] memory his = goals.goalIdsOf(tunde);
        assertEq(his.length, 1);
        assertEq(his[0], t1);
    }

    function test_TargetDateIsOptional() public {
        vm.prank(amara);
        uint256 id = goals.create("Someday", TARGET, 0);
        assertEq(goals.goalOf(id).targetDate, 0);
    }

    function test_RevertWhen_TargetIsZero() public {
        vm.prank(amara);
        vm.expectRevert(KoloGoals.TargetZero.selector);
        goals.create("Nothing", 0, DATE);
    }

    function test_RevertWhen_LabelTooLong() public {
        vm.prank(amara);
        vm.expectRevert(KoloGoals.LabelTooLong.selector);
        goals.create("a label that runs well past forty bytes long", TARGET, DATE);
    }

    /* ---------- contributing ---------- */

    function test_ContributeSetsMoneyAside() public {
        uint256 id = _laptop();
        uint256 before = usd.balanceOf(amara);

        vm.expectEmit(true, true, false, true);
        emit Contributed(id, amara, 50e6, 50e6);
        vm.prank(amara);
        goals.contribute(id, 50e6);

        assertEq(goals.goalOf(id).saved, 50e6);
        assertEq(usd.balanceOf(amara), before - 50e6);
        assertEq(usd.balanceOf(address(goals)), 50e6);
    }

    function test_RevertWhen_SomeoneElseContributes() public {
        uint256 id = _laptop();
        vm.prank(tunde);
        vm.expectRevert(KoloGoals.NotOwner.selector);
        goals.contribute(id, 10e6);
    }

    function test_RevertWhen_ContributingZero() public {
        uint256 id = _laptop();
        vm.prank(amara);
        vm.expectRevert(KoloGoals.AmountZero.selector);
        goals.contribute(id, 0);
    }

    function test_RevertWhen_GoalDoesNotExist() public {
        vm.prank(amara);
        vm.expectRevert(KoloGoals.GoalNotFound.selector);
        goals.contribute(99, 10e6);
    }

    /* ---------- reaching the target ---------- */

    function test_BelowTargetIsNotReached() public {
        uint256 id = _laptop();
        vm.prank(amara);
        goals.contribute(id, TARGET - 1);

        assertFalse(goals.goalOf(id).reached);
        assertEq(goals.goalOf(id).reachedAt, 0);
    }

    function test_ReachingTheTargetIsRecordedWhenItHappens() public {
        uint256 id = _laptop();
        vm.prank(amara);
        goals.contribute(id, 120e6);

        vm.warp(block.timestamp + 3 days);
        vm.expectEmit(true, true, false, true);
        emit GoalReached(id, amara, uint64(block.timestamp));
        vm.prank(amara);
        goals.contribute(id, 80e6);

        KoloGoals.Goal memory goal = goals.goalOf(id);
        assertTrue(goal.reached);
        assertEq(goal.reachedAt, uint64(block.timestamp));
    }

    function test_OvershootingInOneGoCountsAsReached() public {
        uint256 id = _laptop();
        vm.prank(amara);
        goals.contribute(id, TARGET + 30e6);
        assertTrue(goals.goalOf(id).reached);
    }

    function test_ReachedIsOnlyAnnouncedOnce() public {
        uint256 id = _laptop();
        vm.prank(amara);
        goals.contribute(id, TARGET);
        uint64 firstReached = goals.goalOf(id).reachedAt;

        vm.warp(block.timestamp + 1 days);
        vm.recordLogs();
        vm.prank(amara);
        goals.contribute(id, 10e6);

        bytes32 reachedTopic = keccak256("GoalReached(uint256,address,uint64)");
        uint256 announcements;
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].topics[0] == reachedTopic) ++announcements;
        }
        assertEq(announcements, 0, "no second celebration");
        assertEq(goals.goalOf(id).reachedAt, firstReached, "the moment is kept");
    }

    function test_ReachedStaysAfterWithdrawingBelowTarget() public {
        uint256 id = _laptop();
        vm.startPrank(amara);
        goals.contribute(id, TARGET);
        goals.withdraw(id, TARGET);
        vm.stopPrank();

        KoloGoals.Goal memory goal = goals.goalOf(id);
        assertEq(goal.saved, 0);
        assertTrue(goal.reached, "reaching it happened; taking it out does not undo that");
    }

    /* ---------- withdrawing: no lock ---------- */

    function test_WithdrawBeforeTheTargetWithNoPenalty() public {
        uint256 id = _laptop();
        uint256 before = usd.balanceOf(amara);

        vm.startPrank(amara);
        goals.contribute(id, 70e6);
        vm.expectEmit(true, true, false, true);
        emit Withdrawn(id, amara, 70e6, 0);
        goals.withdraw(id, 70e6);
        vm.stopPrank();

        assertEq(usd.balanceOf(amara), before, "every cent back, before the target, no penalty");
    }

    function test_WithdrawBeforeTheTargetDate() public {
        uint256 id = _laptop();
        vm.startPrank(amara);
        goals.contribute(id, TARGET);
        vm.warp(DATE - 1); // any time, including long before the date
        goals.withdraw(id, TARGET);
        vm.stopPrank();
        assertEq(goals.goalOf(id).saved, 0);
    }

    function test_PartialWithdrawal() public {
        uint256 id = _laptop();
        vm.startPrank(amara);
        goals.contribute(id, 100e6);
        goals.withdraw(id, 30e6);
        vm.stopPrank();
        assertEq(goals.goalOf(id).saved, 70e6);
    }

    function test_RevertWhen_SomeoneElseWithdraws() public {
        uint256 id = _laptop();
        vm.prank(amara);
        goals.contribute(id, 100e6);

        vm.prank(tunde);
        vm.expectRevert(KoloGoals.NotOwner.selector);
        goals.withdraw(id, 100e6);
    }

    function test_RevertWhen_WithdrawingMoreThanSaved() public {
        uint256 id = _laptop();
        vm.startPrank(amara);
        goals.contribute(id, 100e6);
        vm.expectRevert(KoloGoals.NotEnoughSaved.selector);
        goals.withdraw(id, 100e6 + 1);
        vm.stopPrank();
    }

    function test_RevertWhen_WithdrawingZero() public {
        uint256 id = _laptop();
        vm.prank(amara);
        vm.expectRevert(KoloGoals.AmountZero.selector);
        goals.withdraw(id, 0);
    }

    function test_GoalsDoNotShareMoney() public {
        uint256 hers = _laptop();
        vm.prank(tunde);
        uint256 his = goals.create("Rent", 300e6, 0);

        vm.prank(amara);
        goals.contribute(hers, 100e6);
        vm.prank(tunde);
        goals.contribute(his, 40e6);

        // Tunde cannot reach into Amara's goal even by overdrawing his own.
        vm.prank(tunde);
        vm.expectRevert(KoloGoals.NotEnoughSaved.selector);
        goals.withdraw(his, 41e6);

        assertEq(goals.goalOf(hers).saved, 100e6);
    }

    /* ---------- the demo ---------- */

    /// Create, contribute in two steps, reach the target, withdraw anyway.
    function test_TheGoalsDemo() public {
        uint256 start = usd.balanceOf(amara);
        uint256 id = _laptop();

        vm.startPrank(amara);
        goals.contribute(id, 120e6);
        assertFalse(goals.goalOf(id).reached);

        goals.contribute(id, 80e6);
        assertTrue(goals.goalOf(id).reached, "the celebration moment");

        goals.withdraw(id, TARGET);
        vm.stopPrank();

        assertEq(usd.balanceOf(amara), start, "all of it back: nothing was locked");
        assertEq(usd.balanceOf(address(goals)), 0);
        assertTrue(goals.goalOf(id).reached);
    }

    /* ---------- accounting, under fuzzing ---------- */

    uint256[3] internal _ids;
    uint256 internal _amaraStart;
    uint256 internal _tundeStart;

    /// Random contributions and withdrawals by two owners across three goals.
    /// After every step: nobody's money has appeared or vanished, and the
    /// contract holds exactly what is saved across all goals.
    function testFuzz_MoneyIsNeverCreatedOrLost(uint256 seed) public {
        _amaraStart = usd.balanceOf(amara);
        _tundeStart = usd.balanceOf(tunde);

        vm.prank(amara);
        _ids[0] = goals.create("A1", 150e6, 0);
        vm.prank(tunde);
        _ids[1] = goals.create("T1", 90e6, 0);
        vm.prank(amara);
        _ids[2] = goals.create("A2", 400e6, 0);

        for (uint256 step; step < 24; ++step) {
            _randomStep(uint256(keccak256(abi.encode(seed, step))));
            _assertBooksBalance();
        }
    }

    function _randomStep(uint256 r) internal {
        uint256 id = _ids[r % 3];
        address owner = goals.goalOf(id).owner;

        if ((r >> 8) % 2 == 0) {
            uint256 amount = bound(r >> 16, 1, 60e6);
            if (usd.balanceOf(owner) < amount) return;
            vm.prank(owner);
            goals.contribute(id, amount);
        } else {
            uint256 saved = goals.goalOf(id).saved;
            if (saved == 0) return;
            vm.prank(owner);
            goals.withdraw(id, bound(r >> 16, 1, saved));
        }
    }

    function _assertBooksBalance() internal view {
        uint256 amaraSaved = goals.goalOf(_ids[0]).saved + goals.goalOf(_ids[2]).saved;
        uint256 tundeSaved = goals.goalOf(_ids[1]).saved;

        assertEq(usd.balanceOf(address(goals)), amaraSaved + tundeSaved, "the contract holds exactly what is saved");
        assertEq(usd.balanceOf(amara) + amaraSaved, _amaraStart, "amara's money is all accounted for");
        assertEq(usd.balanceOf(tunde) + tundeSaved, _tundeStart, "tunde's money is all accounted for");
    }
}
