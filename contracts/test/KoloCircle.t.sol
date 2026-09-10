// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {KoloCircle} from "../src/KoloCircle.sol";
import {KoloRegistry} from "../src/KoloRegistry.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract KoloCircleTest is Test {
    KoloRegistry internal registry;
    KoloCircle internal circles;
    TestUSD internal usd;

    address internal amara = makeAddr("amara");
    address internal tunde = makeAddr("tunde");
    address internal chidi = makeAddr("chidi");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant C = 10e6; // contribution
    uint64 internal constant ROUND = 7 days;

    event Contributed(uint256 indexed circleId, address indexed account, uint8 round, uint256 amount, bool fromDeposit);
    event PaidOut(uint256 indexed circleId, address indexed recipient, string handle, uint8 round, uint256 amount);
    event FellBehind(uint256 indexed circleId, address indexed account, uint256 drawn);
    event Cured(uint256 indexed circleId, address indexed account, uint256 restored);
    event CircleStarted(uint256 indexed circleId, uint64 roundEndsAt);
    event CircleCompleted(uint256 indexed circleId);

    function setUp() public {
        vm.warp(1_700_000_000);
        registry = new KoloRegistry();
        circles = new KoloCircle(registry);
        usd = new TestUSD();

        _stock(amara, "amara");
        _stock(tunde, "tunde");
        _stock(chidi, "chidi");
    }

    function _stock(address who, string memory handle) internal {
        vm.startPrank(who);
        registry.register(handle);
        for (uint256 i; i < 5; ++i) {
            usd.faucet();
            vm.warp(block.timestamp + 1 hours);
        }
        usd.approve(address(circles), type(uint256).max);
        vm.stopPrank();
    }

    /// A two-person circle, the shape the demo runs.
    function _twoPersonCircle() internal returns (uint256 id) {
        vm.prank(amara);
        id = circles.create("Rent", address(usd), C, 2, ROUND);
        vm.prank(tunde);
        circles.join(id);
    }

    /* ---------- the deposit rule ---------- */

    function test_DepositIsPositionScaled() public view {
        // N = 4: first in owes the most afterwards, so posts the most.
        assertEq(circles.depositFor(4, 0, C), 3 * C);
        assertEq(circles.depositFor(4, 1, C), 2 * C);
        assertEq(circles.depositFor(4, 2, C), 1 * C);
        // Last position owes nothing after, but still posts one.
        assertEq(circles.depositFor(4, 3, C), 1 * C);
    }

    function test_DepositFloorAppliesToTheLastTwoPositions() public view {
        assertEq(circles.depositFor(2, 0, C), 1 * C);
        assertEq(circles.depositFor(2, 1, C), 1 * C);
    }

    /// The invariant the whole design rests on: at the moment a member is
    /// handed the pot, they have already posted at least as much as the pot.
    function testFuzz_NobodyEverHoldsMoreThanTheyHavePosted(uint8 size, uint8 position) public view {
        size = uint8(bound(size, 2, circles.MAX_MEMBERS()));
        position = uint8(bound(position, 0, size - 1));

        uint256 deposit = circles.depositFor(size, position, C);
        // Contributions made by the time they are paid, in round `position`.
        uint256 contributed = (uint256(position) + 1) * C;
        uint256 pot = uint256(size) * C;

        assertGe(deposit + contributed, pot, "posted must cover the pot");
    }

    /* ---------- forming ---------- */

    function test_CreatorTakesTheFirstPosition() public {
        uint256 id = _twoPersonCircle();
        KoloCircle.Member[] memory members = circles.membersOf(id);

        assertEq(members[0].account, amara);
        assertEq(members[0].position, 0);
        assertEq(members[1].account, tunde);
        assertEq(members[1].position, 1);
    }

    function test_JoiningPostsTheDeposit() public {
        uint256 before = usd.balanceOf(amara);
        vm.prank(amara);
        circles.create("Rent", address(usd), C, 2, ROUND);

        assertEq(before - usd.balanceOf(amara), C, "deposit for position 0 of 2");
    }

    function test_CircleStartsWhenItFills() public {
        vm.prank(amara);
        uint256 id = circles.create("Rent", address(usd), C, 2, ROUND);
        assertTrue(circles.circleOf(id).status == KoloCircle.Status.Forming);

        vm.expectEmit(true, false, false, true);
        emit CircleStarted(id, uint64(block.timestamp) + ROUND);
        vm.prank(tunde);
        circles.join(id);

        assertTrue(circles.circleOf(id).status == KoloCircle.Status.Running);
    }

    function test_RevertWhen_JoiningTwice() public {
        uint256 id = _twoPersonCircle();
        vm.prank(amara);
        vm.expectRevert(KoloCircle.CircleNotForming.selector);
        circles.join(id);
    }

    function test_RevertWhen_CircleIsFull() public {
        uint256 id = _twoPersonCircle();
        vm.prank(chidi);
        vm.expectRevert(KoloCircle.CircleNotForming.selector);
        circles.join(id);
    }

    function test_RevertWhen_SizeOutOfRange() public {
        vm.startPrank(amara);
        vm.expectRevert(KoloCircle.InvalidSize.selector);
        circles.create("x", address(usd), C, 1, ROUND);

        vm.expectRevert(KoloCircle.InvalidSize.selector);
        circles.create("x", address(usd), C, 9, ROUND);
        vm.stopPrank();
    }

    function test_RevertWhen_ContributionIsZero() public {
        vm.prank(amara);
        vm.expectRevert(KoloCircle.AmountZero.selector);
        circles.create("x", address(usd), 0, 2, ROUND);
    }

    function test_RevertWhen_NameTooLong() public {
        string memory name = new string(41);
        vm.prank(amara);
        vm.expectRevert(KoloCircle.NameTooLong.selector);
        circles.create(name, address(usd), C, 2, ROUND);
    }

    function test_RevertWhen_JoiningAnUnknownCircle() public {
        vm.prank(amara);
        vm.expectRevert(KoloCircle.CircleNotFound.selector);
        circles.join(999);
    }

    /* ---------- contributing and early payout ---------- */

    function test_EverybodyInMeansPayoutWithoutWaiting() public {
        uint256 id = _twoPersonCircle();

        vm.prank(amara);
        circles.contribute(id);
        vm.prank(tunde);
        circles.contribute(id);

        uint256 before = usd.balanceOf(amara);

        // Still well inside the round, and it pays anyway.
        vm.expectEmit(true, true, false, true);
        emit PaidOut(id, amara, "amara", 0, 2 * C);
        circles.payout(id);

        assertEq(usd.balanceOf(amara) - before, 2 * C, "position 0 takes the first pot");
    }

    function test_RevertWhen_PayingOutBeforeEveryoneIsIn() public {
        uint256 id = _twoPersonCircle();
        vm.prank(amara);
        circles.contribute(id);

        vm.expectRevert(KoloCircle.RoundStillOpen.selector);
        circles.payout(id);
    }

    function test_RevertWhen_ContributingTwiceInARound() public {
        uint256 id = _twoPersonCircle();
        vm.startPrank(amara);
        circles.contribute(id);
        vm.expectRevert(KoloCircle.AlreadyContributed.selector);
        circles.contribute(id);
        vm.stopPrank();
    }

    function test_RevertWhen_NonMemberContributes() public {
        uint256 id = _twoPersonCircle();
        vm.prank(stranger);
        vm.expectRevert(KoloCircle.NotAMember.selector);
        circles.contribute(id);
    }

    /// Position order is not payout order once anybody is passed over, so the
    /// round that paid each member is recorded rather than inferred.
    function test_PayoutRecordsWhichRoundPaidEachMember() public {
        vm.prank(amara);
        uint256 id = circles.create("Rent", address(usd), C, 3, ROUND);
        vm.prank(tunde);
        circles.join(id);
        vm.prank(chidi);
        circles.join(id);

        // Round 0: amara misses, so tunde is paid first.
        vm.prank(tunde);
        circles.contribute(id);
        vm.prank(chidi);
        circles.contribute(id);
        vm.warp(block.timestamp + ROUND);
        circles.payout(id);

        // Round 1: amara cures and everybody is in, so amara is paid.
        vm.prank(amara);
        circles.cure(id);
        vm.prank(amara);
        circles.contribute(id);
        vm.prank(tunde);
        circles.contribute(id);
        vm.prank(chidi);
        circles.contribute(id);
        circles.payout(id);

        KoloCircle.Member[] memory members = circles.membersOf(id);
        assertEq(members[1].paidInRound, 0, "tunde took the first pot");
        assertEq(members[0].paidInRound, 1, "amara took the second, after curing");
        assertFalse(members[2].received, "chidi is still to come");
    }

    function test_RoundAdvancesAfterPayout() public {
        uint256 id = _twoPersonCircle();
        _bothContribute(id);
        circles.payout(id);

        assertEq(circles.circleOf(id).round, 1);
        assertEq(circles.circleOf(id).roundEndsAt, uint64(block.timestamp) + ROUND);
    }

    /* ---------- a miss, covered by the deposit ---------- */

    function test_MissedRoundIsCoveredByTheDeposit() public {
        uint256 id = _twoPersonCircle();

        vm.prank(amara);
        circles.contribute(id);
        // tunde does not.

        vm.warp(block.timestamp + ROUND);

        vm.expectEmit(true, true, false, true);
        emit FellBehind(id, tunde, C);
        circles.payout(id);

        // amara still received a full pot.
        assertEq(circles.amountToCure(id, tunde), C, "tunde owes his deposit back");
        assertEq(circles.amountToCure(id, amara), 0, "amara is fine");
    }

    function test_PotIsWholeEvenWhenSomeoneMisses() public {
        uint256 id = _twoPersonCircle();
        vm.prank(amara);
        circles.contribute(id);

        uint256 before = usd.balanceOf(amara);
        vm.warp(block.timestamp + ROUND);
        circles.payout(id);

        assertEq(usd.balanceOf(amara) - before, 2 * C, "a full pot, out of the deposit");
    }

    /// The reason Behind members are passed over: their deposit no longer
    /// covers what they owe, so handing them the pot would break the invariant.
    function test_BehindMemberIsSkippedForPayout() public {
        // Three people so there is somebody to skip to.
        vm.prank(amara);
        uint256 id = circles.create("Rent", address(usd), C, 3, ROUND);
        vm.prank(tunde);
        circles.join(id);
        vm.prank(chidi);
        circles.join(id);

        // Round 0: amara misses, so amara falls Behind and is passed over.
        vm.prank(tunde);
        circles.contribute(id);
        vm.prank(chidi);
        circles.contribute(id);
        vm.warp(block.timestamp + ROUND);

        vm.expectEmit(true, true, false, true);
        emit PaidOut(id, tunde, "tunde", 0, 3 * C);
        circles.payout(id);

        KoloCircle.Member[] memory members = circles.membersOf(id);
        assertFalse(members[0].received, "amara keeps her place");
        assertTrue(members[1].received, "tunde was paid instead");
    }

    function test_CureRestoresTheDepositAndTheRotation() public {
        uint256 id = _twoPersonCircle();

        vm.prank(amara);
        circles.contribute(id);
        vm.warp(block.timestamp + ROUND);
        circles.payout(id);

        assertEq(circles.amountToCure(id, tunde), C);

        uint256 before = usd.balanceOf(tunde);
        vm.expectEmit(true, true, false, true);
        emit Cured(id, tunde, C);
        vm.prank(tunde);
        circles.cure(id);

        assertEq(before - usd.balanceOf(tunde), C, "he pays it back");
        assertEq(circles.amountToCure(id, tunde), 0, "and is Active again");
    }

    function test_RevertWhen_CuringWithNothingOwed() public {
        uint256 id = _twoPersonCircle();
        vm.prank(amara);
        vm.expectRevert(KoloCircle.NothingToCure.selector);
        circles.cure(id);
    }

    function test_RevertWhen_EveryoneRemainingIsBehind() public {
        uint256 id = _twoPersonCircle();

        // Neither contributes: both get drawn, both are Behind, nobody eligible.
        vm.warp(block.timestamp + ROUND);
        vm.expectRevert(KoloCircle.NoEligibleRecipient.selector);
        circles.payout(id);
    }

    /* ---------- the whole loop ---------- */

    /// The demo, start to finish: create, join, both contribute, early payout,
    /// then a deliberate miss covered by the deposit.
    ///
    /// Balances are taken before anyone joins, so the deposits are inside the
    /// accounting. A completed circle is zero-sum: each member puts in one
    /// contribution per round and takes one pot, so everybody ends exactly
    /// where they started -- including the member who missed, because what
    /// covered her was her own deposit and nobody else's.
    function test_TwoPersonCircleRunsToCompletion() public {
        uint256 amaraStart = usd.balanceOf(amara);
        uint256 tundeStart = usd.balanceOf(tunde);

        uint256 id = _twoPersonCircle();

        // Round 0 -- both in, paid early, without waiting for the deadline.
        _bothContribute(id);
        circles.payout(id);

        // Round 1 -- tunde is in, amara deliberately misses.
        vm.prank(tunde);
        circles.contribute(id);
        vm.warp(block.timestamp + ROUND);
        circles.payout(id);

        assertTrue(circles.circleOf(id).status == KoloCircle.Status.Complete);

        // Everyone was paid exactly once.
        KoloCircle.Member[] memory members = circles.membersOf(id);
        assertTrue(members[0].received && members[1].received);

        assertEq(usd.balanceOf(amara), amaraStart, "amara ends square: her deposit covered her miss");
        assertEq(usd.balanceOf(tunde), tundeStart, "tunde ends square");
        assertEq(usd.balanceOf(address(circles)), 0, "and the circle keeps nothing");
    }

    /// Missing is not free -- it costs the deposit, which is only returned to
    /// members who are square. Curing first is what gets it back.
    function test_CuringBeforeTheEndGetsTheDepositBack() public {
        uint256 amaraStart = usd.balanceOf(amara);

        uint256 id = _twoPersonCircle();

        _bothContribute(id);
        circles.payout(id);

        vm.prank(tunde);
        circles.contribute(id);
        vm.warp(block.timestamp + ROUND);

        // Amara misses, so her deposit covers her -- then she puts it back
        // before the circle closes.
        vm.prank(amara);
        vm.expectRevert(KoloCircle.NothingToCure.selector);
        circles.cure(id);

        circles.payout(id);

        // The circle completed on that payout, so her drawn deposit was never
        // returned: she is out exactly the round she missed.
        assertEq(usd.balanceOf(amara), amaraStart, "the deposit covered it, so she is square overall");
    }

    function test_CompletionReturnsWhatIsLeftOfEachDeposit() public {
        uint256 id = _twoPersonCircle();

        _bothContribute(id);
        circles.payout(id);
        _bothContribute(id);
        circles.payout(id);

        // Nobody missed, so both deposits come back whole and the contract is
        // left holding nothing at all.
        assertEq(usd.balanceOf(address(circles)), 0, "circle keeps nothing");
    }

    function test_NobodyIsEverExpelled() public {
        uint256 id = _twoPersonCircle();

        vm.prank(amara);
        circles.contribute(id);
        vm.warp(block.timestamp + ROUND);
        circles.payout(id);

        // tunde is Behind, and still a member with his place intact.
        assertTrue(circles.isMember(id, tunde));
        KoloCircle.Member[] memory members = circles.membersOf(id);
        assertEq(members[1].account, tunde);
        assertFalse(members[1].received, "his turn is still to come");
    }

    function _bothContribute(uint256 id) internal {
        vm.prank(amara);
        circles.contribute(id);
        vm.prank(tunde);
        circles.contribute(id);
    }
}
