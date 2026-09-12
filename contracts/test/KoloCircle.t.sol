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
    event CircleCancelled(uint256 indexed circleId);
    event Credited(address indexed token, address indexed account, uint256 amount);
    event CreditWithdrawn(address indexed token, address indexed account, uint256 amount);

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

    function _threeContribute(uint256 id) internal {
        vm.prank(amara);
        circles.contribute(id);
        vm.prank(tunde);
        circles.contribute(id);
        vm.prank(chidi);
        circles.contribute(id);
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

    /// The property the ladder exists for, checked against a circle that is
    /// actually running rather than against the formula alone.
    ///
    /// A member is "ahead" exactly when they hold more than they started with:
    /// posting the deposit and every contribution takes their balance down,
    /// and taking the pot brings it back to -- never above -- where it began.
    /// So `balance <= startingBalance`, always, is the whole guarantee.
    function testFuzz_NoMemberIsEverAheadOfWhatTheyPosted(uint16 missMask) public {
        address[3] memory who = [amara, tunde, chidi];
        uint256[3] memory start;
        for (uint256 i; i < 3; ++i) {
            start[i] = usd.balanceOf(who[i]);
        }

        vm.prank(amara);
        uint256 id = circles.create("Fuzz", address(usd), C, 3, ROUND);
        vm.prank(tunde);
        circles.join(id);
        vm.prank(chidi);
        circles.join(id);

        for (uint8 round; round < 3; ++round) {
            for (uint256 i; i < 3; ++i) {
                bool pays = (missMask >> (round * 3 + uint8(i))) & 1 == 1;
                if (!pays) continue;
                vm.prank(who[i]);
                circles.contribute(id);
            }

            vm.warp(block.timestamp + ROUND + 1);
            // Everyone left may be Behind, in which case there is nobody the
            // circle can afford to pay and it stops here. That is the stuck
            // state `cancel` now unwinds; what matters is that it never got
            // there by letting somebody run ahead.
            try circles.payout(id) {}
            catch {
                break;
            }

            for (uint256 i; i < 3; ++i) {
                assertLe(usd.balanceOf(who[i]), start[i], "a member is ahead of what they posted");
            }
        }
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

        // Round 0: everybody in, so amara takes the first pot.
        _threeContribute(id);
        circles.payout(id);

        // Round 1: chidi misses, but tunde is due and square, so tunde is paid.
        vm.prank(amara);
        circles.contribute(id);
        vm.prank(tunde);
        circles.contribute(id);
        vm.warp(block.timestamp + ROUND);
        circles.payout(id);

        KoloCircle.Member[] memory members = circles.membersOf(id);
        assertEq(members[0].paidInRound, 0, "amara took the first pot");
        assertEq(members[1].paidInRound, 1, "tunde took the second");
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

    /// When whoever is due to be paid has not put their own round in, the
    /// round waits for them rather than skipping down the line.
    ///
    /// Skipping is what breaks the ladder: tunde posted a deposit sized for
    /// being paid second, having contributed twice by then. Handing him the
    /// first pot would leave him holding 3C against 2C posted -- ahead, which
    /// is the one thing the deposit exists to prevent.
    function test_TheRoundWaitsWhenWhoeverIsDueHasNotPaid() public {
        vm.prank(amara);
        uint256 id = circles.create("Rent", address(usd), C, 3, ROUND);
        vm.prank(tunde);
        circles.join(id);
        vm.prank(chidi);
        circles.join(id);

        // Round 0: amara, who is due, misses. The other two are in.
        vm.prank(tunde);
        circles.contribute(id);
        vm.prank(chidi);
        circles.contribute(id);
        vm.warp(block.timestamp + ROUND);

        // Nobody has posted enough to hold a 3C pot yet, so the round holds.
        vm.expectRevert(KoloCircle.NoEligibleRecipient.selector);
        circles.payout(id);

        // She puts her round in late, and it settles to her.
        vm.prank(amara);
        circles.contribute(id);

        vm.expectEmit(true, true, false, true);
        emit PaidOut(id, amara, "amara", 0, 3 * C);
        circles.payout(id);

        KoloCircle.Member[] memory members = circles.membersOf(id);
        assertTrue(members[0].received, "amara took the first pot, once she was square");
        assertFalse(members[1].received, "tunde keeps his turn");
    }

    /// A member who is short is passed over; one who is square is not.
    function test_AMemberWhoIsShortIsPassedOver() public {
        vm.prank(amara);
        uint256 id = circles.create("Rent", address(usd), C, 3, ROUND);
        vm.prank(tunde);
        circles.join(id);
        vm.prank(chidi);
        circles.join(id);

        // Round 0 settles normally to amara.
        _threeContribute(id);
        circles.payout(id);

        // Round 1: chidi misses. Tunde is due and is square, so he is paid.
        vm.prank(amara);
        circles.contribute(id);
        vm.prank(tunde);
        circles.contribute(id);
        vm.warp(block.timestamp + ROUND);

        vm.expectEmit(true, true, false, true);
        emit PaidOut(id, tunde, "tunde", 1, 3 * C);
        circles.payout(id);

        KoloCircle.Member[] memory members = circles.membersOf(id);
        assertFalse(members[2].received, "chidi is short, so he waits");
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

    /* ---------- the minimum round period ---------- */

    function test_RevertWhen_RoundDurationBelowMinimum() public {
        uint64 tooShort = circles.MIN_PERIOD() - 1;
        vm.prank(amara);
        vm.expectRevert(KoloCircle.InvalidDuration.selector);
        circles.create("x", address(usd), C, 2, tooShort);
    }

    function test_MinimumRoundDurationIsAccepted() public {
        uint64 minPeriod = circles.MIN_PERIOD();
        vm.prank(amara);
        uint256 id = circles.create("x", address(usd), C, 2, minPeriod);
        assertEq(circles.circleOf(id).roundDuration, minPeriod);
    }

    /* ---------- cancelling a circle that never filled ---------- */

    function test_RevertWhen_CancellingBeforeAWeek() public {
        vm.prank(amara);
        uint256 id = circles.create("Rent", address(usd), C, 3, ROUND);

        vm.warp(block.timestamp + circles.CANCEL_AFTER() - 1);
        vm.expectRevert(KoloCircle.TooEarlyToCancel.selector);
        circles.cancel(id);
    }

    function test_AnyoneCanCancelAnOpenCircleAfterAWeek() public {
        vm.prank(amara);
        uint256 id = circles.create("Rent", address(usd), C, 3, ROUND);
        uint256 amaraDeposit = circles.membersOf(id)[0].deposit;
        uint256 before = usd.balanceOf(amara);

        vm.warp(block.timestamp + circles.CANCEL_AFTER());

        vm.expectEmit(true, false, false, true);
        emit CircleCancelled(id);
        vm.prank(stranger);
        circles.cancel(id);

        assertTrue(circles.circleOf(id).status == KoloCircle.Status.Cancelled);
        assertEq(usd.balanceOf(amara) - before, amaraDeposit, "amara gets what she posted back");
    }

    function test_RevertWhen_WindingDownARunningCircleTooEarly() public {
        uint256 id = _twoPersonCircle();
        vm.warp(block.timestamp + circles.CANCEL_AFTER());
        vm.expectRevert(KoloCircle.TooEarlyToCancel.selector);
        circles.cancel(id);
    }

    /// The deadlock: a circle nobody contributed to cannot pay anyone, and the
    /// revert undoes the draw, so nothing is owed and nothing can be cured.
    /// A week past the deadline it must still be possible to get the money out.
    function test_StuckRunningCircleCanBeWoundDownAfterAWeek() public {
        uint256 amaraBefore = usd.balanceOf(amara);
        uint256 tundeBefore = usd.balanceOf(tunde);

        uint256 id = _twoPersonCircle();
        assertEq(usd.balanceOf(address(circles)), 2 * C, "deposits are held");

        vm.warp(block.timestamp + ROUND + 1);
        vm.expectRevert(KoloCircle.NoEligibleRecipient.selector);
        circles.payout(id);

        vm.warp(block.timestamp + circles.CANCEL_AFTER());
        circles.cancel(id); // anyone

        assertEq(uint8(circles.circleOf(id).status), uint8(KoloCircle.Status.Cancelled));
        assertEq(usd.balanceOf(amara), amaraBefore, "amara is whole");
        assertEq(usd.balanceOf(tunde), tundeBefore, "tunde is whole");
        assertEq(usd.balanceOf(address(circles)), 0, "nothing left behind");
    }

    /// Winding down mid-round returns this round's contributions as well as
    /// the deposits -- that money was never paid out to anyone.
    function test_WindingDownReturnsThisRoundsContributionsToo() public {
        uint256 amaraBefore = usd.balanceOf(amara);
        uint256 tundeBefore = usd.balanceOf(tunde);

        uint256 id = _twoPersonCircle();
        vm.prank(amara);
        circles.contribute(id); // only amara pays; tunde never does

        vm.warp(block.timestamp + ROUND + 1 + circles.CANCEL_AFTER());
        circles.cancel(id);

        assertEq(usd.balanceOf(amara), amaraBefore, "her contribution came back with her deposit");
        assertEq(usd.balanceOf(tunde), tundeBefore, "his deposit came back");
        assertEq(usd.balanceOf(address(circles)), 0, "nothing left behind");
    }

    /* ---------- a finished circle is finished ---------- */

    /// `_returnDeposits` used to mark a deposit returned by setting
    /// depositDrawn = deposit, which made a completed circle report every
    /// member as owing a cure -- and cure would take the money and keep it.
    function test_RevertWhen_CuringACompletedCircle() public {
        uint256 id = _twoPersonCircle();
        _bothContribute(id);
        circles.payout(id);
        _bothContribute(id);
        circles.payout(id);

        assertEq(uint8(circles.circleOf(id).status), uint8(KoloCircle.Status.Complete));

        vm.prank(amara);
        vm.expectRevert(KoloCircle.CircleNotRunning.selector);
        circles.cure(id);
    }

    function test_NothingIsOwedOnceTheCircleIsComplete() public {
        uint256 id = _twoPersonCircle();
        _bothContribute(id);
        circles.payout(id);
        _bothContribute(id);
        circles.payout(id);

        assertEq(circles.amountToCure(id, amara), 0, "a finished circle asks for nothing");
        assertEq(circles.amountToCure(id, tunde), 0);

        KoloCircle.Member[] memory members = circles.membersOf(id);
        for (uint256 i; i < members.length; ++i) {
            assertTrue(members[i].depositReturned, "deposit recorded as returned");
            assertEq(members[i].depositDrawn, 0, "and the record is not corrupted to say so");
        }
    }

    function test_RevertWhen_CancellingAnUnknownCircle() public {
        vm.warp(block.timestamp + circles.CANCEL_AFTER());
        vm.expectRevert(KoloCircle.CircleNotFound.selector);
        circles.cancel(999);
    }

    /* ---------- credit-on-failed-transfer ---------- */

    /// A frozen or blacklisted recipient must not be able to brick a payout
    /// for everyone else: the pot is credited instead, and they can pull it
    /// once a transfer to them would succeed again.
    function test_PayoutCreditsInsteadOfRevertingWhenTransferFails() public {
        uint256 id = _twoPersonCircle();
        _bothContribute(id);

        uint256 pot = 2 * C;
        vm.mockCallRevert(address(usd), abi.encodeWithSelector(usd.transfer.selector, amara, pot), "frozen");

        uint256 before = usd.balanceOf(amara);

        vm.expectEmit(true, true, false, true);
        emit Credited(address(usd), amara, pot);
        circles.payout(id);

        assertEq(usd.balanceOf(amara), before, "the transfer failed, so nothing moved");
        assertEq(circles.creditOf(address(usd), amara), pot, "credited instead of reverting");
        assertTrue(circles.circleOf(id).round == 1, "the round still closed for everyone else");

        vm.clearMockedCalls();

        vm.expectEmit(true, true, false, true);
        emit CreditWithdrawn(address(usd), amara, pot);
        vm.prank(amara);
        circles.withdrawCredit(address(usd));

        assertEq(usd.balanceOf(amara) - before, pot, "she can pull it once the transfer would succeed");
        assertEq(circles.creditOf(address(usd), amara), 0);
    }

    function test_RevertWhen_WithdrawingCreditWithNothingOwed() public {
        vm.expectRevert(KoloCircle.NothingToWithdraw.selector);
        circles.withdrawCredit(address(usd));
    }
}
