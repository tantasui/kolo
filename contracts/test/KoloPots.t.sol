// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {KoloPots} from "../src/KoloPots.sol";
import {KoloRegistry} from "../src/KoloRegistry.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract KoloPotsTest is Test {
    KoloRegistry internal registry;
    KoloPots internal pots;
    TestUSD internal usd;

    address internal amara = makeAddr("amara");
    address internal tunde = makeAddr("tunde");
    address internal chidi = makeAddr("chidi");
    address internal premium = makeAddr("premium"); // the service being paid for

    /// $1 per unit of use.
    uint256 internal constant PRICE = 1e6;

    event Used(uint256 indexed potId, address indexed member, uint256 units, uint256 amount);
    event Withdrawn(uint256 indexed potId, address indexed member, uint256 amount);
    event PotClosed(uint256 indexed potId);

    function setUp() public {
        vm.warp(1_700_000_000);
        registry = new KoloRegistry();
        usd = new TestUSD();
        pots = new KoloPots(registry, IERC20(address(usd)));

        _stock(amara, "amara");
        _stock(tunde, "tunde");
        _stock(chidi, "chidi");
    }

    /// $500 each, a handle, and an approval.
    function _stock(address who, string memory handle) internal {
        vm.startPrank(who);
        registry.register(handle);
        for (uint256 i; i < 5; ++i) {
            usd.faucet();
            vm.warp(block.timestamp + 1 hours);
        }
        usd.approve(address(pots), type(uint256).max);
        vm.stopPrank();
    }

    /// Amara opens a pot with $100; Tunde joins with $100.
    function _pot() internal returns (uint256 id) {
        vm.prank(amara);
        id = pots.create("Premium", premium, PRICE, 100e6);
        vm.prank(tunde);
        pots.join(id, 100e6);
    }

    /* ---------- the fairness claim ---------- */

    /// The scenario the pot exists to get right, including the case the first
    /// draft got wrong: A spending past her own share.
    function test_YouOnlyPayForWhatYouUsed() public {
        uint256 id = _pot();
        uint256 tundeBefore = usd.balanceOf(tunde);
        uint256 amaraBefore = usd.balanceOf(amara);

        // A uses 80 of her 100. B uses nothing.
        vm.prank(amara);
        pots.use(id, 80);

        // The contract still holds all 200: use moves no money, it only credits
        // the service, which takes its 80 when it asks. Plenty to cover 40 more
        // -- but only 20 of it is hers. Using 40 more must fail, not borrow
        // from Tunde.
        assertEq(usd.balanceOf(address(pots)), 200e6);
        assertEq(pots.earningsOf(premium), 80e6);
        vm.prank(amara);
        vm.expectRevert(KoloPots.InsufficientShare.selector);
        pots.use(id, 40);

        vm.prank(tunde);
        pots.withdraw(id);
        vm.prank(amara);
        pots.withdraw(id);
        vm.prank(premium);
        pots.withdrawEarnings();

        assertEq(usd.balanceOf(tunde) - tundeBefore, 100e6, "B gets all 100 back: A's use never touched it");
        assertEq(usd.balanceOf(amara) - amaraBefore, 20e6, "A gets back what she did not use");
        assertEq(usd.balanceOf(premium), 80e6, "the service is paid exactly what was used");
        assertEq(usd.balanceOf(address(pots)), 0, "nothing left behind");
    }

    function test_AMemberCanSpendTheirWholeShareAndNoMore() public {
        uint256 id = _pot();
        vm.startPrank(amara);
        pots.use(id, 100);
        vm.expectRevert(KoloPots.InsufficientShare.selector);
        pots.use(id, 1);
        vm.stopPrank();
        assertEq(pots.availableOf(id, amara), 0);
        assertEq(pots.availableOf(id, tunde), 100e6);
    }

    /* ---------- opening ---------- */

    function test_CreatorTakesTheFirstPlace() public {
        vm.prank(amara);
        uint256 id = pots.create("Premium", premium, PRICE, 50e6);

        KoloPots.Pot memory pot = pots.potOf(id);
        assertEq(pot.creator, amara);
        assertEq(pot.payee, premium);
        assertEq(pot.price, PRICE);
        assertEq(pot.memberCount, 1);
        assertEq(uint8(pot.status), uint8(KoloPots.Status.Open));
        assertEq(pots.availableOf(id, amara), 50e6);
        assertEq(pots.rosterOf(id)[0], amara);
    }

    function test_AnOrganiserCanOpenAPotWithNothingIn() public {
        vm.prank(amara);
        uint256 id = pots.create("Premium", premium, PRICE, 0);
        assertTrue(pots.memberOf(id, amara).joined);
        assertEq(pots.availableOf(id, amara), 0);
    }

    function test_RevertWhen_PriceIsZero() public {
        vm.prank(amara);
        vm.expectRevert(KoloPots.InvalidPrice.selector);
        pots.create("Premium", premium, 0, 10e6);
    }

    function test_RevertWhen_PayeeIsZero() public {
        vm.prank(amara);
        vm.expectRevert(KoloPots.InvalidPayee.selector);
        pots.create("Premium", address(0), PRICE, 10e6);
    }

    function test_RevertWhen_NameTooLong() public {
        vm.prank(amara);
        vm.expectRevert(KoloPots.NameTooLong.selector);
        pots.create("a pot name that runs well past forty bytes", premium, PRICE, 10e6);
    }

    /* ---------- joining and topping up ---------- */

    function test_JoiningPutsMoneyIn() public {
        uint256 id = _pot();
        assertEq(pots.availableOf(id, tunde), 100e6);
        assertEq(pots.potOf(id).memberCount, 2);
        assertEq(usd.balanceOf(address(pots)), 200e6);
    }

    function test_AnyoneCanJoinAPot() public {
        uint256 id = _pot();
        vm.prank(chidi);
        pots.join(id, 5e6);
        assertEq(pots.availableOf(id, chidi), 5e6);
    }

    function test_RevertWhen_JoiningTwice() public {
        uint256 id = _pot();
        vm.prank(tunde);
        vm.expectRevert(KoloPots.AlreadyJoined.selector);
        pots.join(id, 1e6);
    }

    function test_RevertWhen_JoiningAPotThatDoesNotExist() public {
        vm.prank(tunde);
        vm.expectRevert(KoloPots.PotNotFound.selector);
        pots.join(42, 1e6);
    }

    function test_TopUpAddsToYourShareOnly() public {
        uint256 id = _pot();
        vm.prank(tunde);
        pots.topUp(id, 25e6);
        assertEq(pots.availableOf(id, tunde), 125e6);
        assertEq(pots.availableOf(id, amara), 100e6);
    }

    function test_RevertWhen_NonMemberTopsUp() public {
        uint256 id = _pot();
        vm.prank(chidi);
        vm.expectRevert(KoloPots.NotAMember.selector);
        pots.topUp(id, 1e6);
    }

    function test_RevertWhen_ToppingUpZero() public {
        uint256 id = _pot();
        vm.prank(tunde);
        vm.expectRevert(KoloPots.AmountZero.selector);
        pots.topUp(id, 0);
    }

    /* ---------- using ---------- */

    function test_UseChargesUnitsTimesPriceAndCreditsThePayee() public {
        uint256 id = _pot();

        vm.expectEmit(true, true, false, true);
        emit Used(id, amara, 3, 3e6);
        vm.prank(amara);
        pots.use(id, 3);

        assertEq(pots.memberOf(id, amara).used, 3e6);
        assertEq(pots.potOf(id).used, 3e6);
        assertEq(pots.earningsOf(premium), 3e6);
        assertEq(pots.availableOf(id, amara), 97e6);
    }

    function test_RevertWhen_NonMemberUses() public {
        uint256 id = _pot();
        vm.prank(chidi);
        vm.expectRevert(KoloPots.NotAMember.selector);
        pots.use(id, 1);
    }

    function test_RevertWhen_UsingZeroUnits() public {
        uint256 id = _pot();
        vm.prank(amara);
        vm.expectRevert(KoloPots.AmountZero.selector);
        pots.use(id, 0);
    }

    /* ---------- withdrawing ---------- */

    function test_WithdrawTakesEverythingUnspent() public {
        uint256 id = _pot();
        vm.prank(amara);
        pots.use(id, 30);

        uint256 before = usd.balanceOf(amara);
        vm.expectEmit(true, true, false, true);
        emit Withdrawn(id, amara, 70e6);
        vm.prank(amara);
        pots.withdraw(id);

        assertEq(usd.balanceOf(amara) - before, 70e6);
        assertEq(pots.availableOf(id, amara), 0);
    }

    function test_RevertWhen_WithdrawingTwice() public {
        uint256 id = _pot();
        vm.startPrank(tunde);
        pots.withdraw(id);
        vm.expectRevert(KoloPots.NothingToWithdraw.selector);
        pots.withdraw(id);
        vm.stopPrank();
    }

    function test_RevertWhen_NonMemberWithdraws() public {
        uint256 id = _pot();
        vm.prank(chidi);
        vm.expectRevert(KoloPots.NotAMember.selector);
        pots.withdraw(id);
    }

    function test_ToppingUpAfterWithdrawingWorks() public {
        uint256 id = _pot();
        vm.startPrank(tunde);
        pots.withdraw(id);
        pots.topUp(id, 10e6);
        vm.stopPrank();
        assertEq(pots.availableOf(id, tunde), 10e6);
    }

    function test_PayeeCollectsAcrossPots() public {
        uint256 one = _pot();
        vm.prank(chidi);
        uint256 two = pots.create("Other", premium, 2e6, 20e6);

        vm.prank(amara);
        pots.use(one, 5); // 5
        vm.prank(chidi);
        pots.use(two, 4); // 8

        vm.prank(premium);
        pots.withdrawEarnings();
        assertEq(usd.balanceOf(premium), 13e6);

        vm.prank(premium);
        vm.expectRevert(KoloPots.NothingToWithdraw.selector);
        pots.withdrawEarnings();
    }

    /* ---------- closing ---------- */

    function test_CloseStopsSpendingButNotWithdrawing() public {
        uint256 id = _pot();
        vm.prank(amara);
        pots.use(id, 10);

        vm.expectEmit(true, false, false, false);
        emit PotClosed(id);
        vm.prank(amara);
        pots.close(id);

        vm.prank(amara);
        vm.expectRevert(KoloPots.PotIsClosed.selector);
        pots.use(id, 1);

        vm.prank(tunde);
        vm.expectRevert(KoloPots.PotIsClosed.selector);
        pots.topUp(id, 1e6);

        vm.prank(chidi);
        vm.expectRevert(KoloPots.PotIsClosed.selector);
        pots.join(id, 1e6);

        // Money is never held by closing.
        vm.prank(tunde);
        pots.withdraw(id);
        vm.prank(amara);
        pots.withdraw(id);
        vm.prank(premium);
        pots.withdrawEarnings();
        assertEq(usd.balanceOf(address(pots)), 0);
    }

    function test_CloseNeedsNoZeroBalance() public {
        uint256 id = _pot();
        vm.prank(amara);
        pots.close(id); // with $200 still in it
        assertEq(uint8(pots.potOf(id).status), uint8(KoloPots.Status.Closed));
    }

    function test_RevertWhen_NonCreatorCloses() public {
        uint256 id = _pot();
        vm.prank(tunde);
        vm.expectRevert(KoloPots.NotCreator.selector);
        pots.close(id);
    }

    function test_RevertWhen_ClosingTwice() public {
        uint256 id = _pot();
        vm.startPrank(amara);
        pots.close(id);
        vm.expectRevert(KoloPots.PotIsClosed.selector);
        pots.close(id);
        vm.stopPrank();
    }

    /* ---------- invariants, under fuzzing ---------- */

    address[3] internal _who;
    uint256[2] internal _ids;

    /// Random joins, top-ups, uses, withdrawals, earnings withdrawals and a
    /// close, by three members across two pots. After every step:
    ///   1. every member row balances: used + withdrawn <= contributed
    ///   2. every pot's used equals the sum of its members' used
    ///   3. the contract holds exactly the unspent shares plus unpaid earnings
    function testFuzz_TheBooksAlwaysBalance(uint256 seed) public {
        _who = [amara, tunde, chidi];

        vm.prank(amara);
        _ids[0] = pots.create("P0", premium, PRICE, 40e6);
        vm.prank(tunde);
        _ids[1] = pots.create("P1", premium, 3e6, 30e6);

        for (uint256 step; step < 30; ++step) {
            _randomStep(uint256(keccak256(abi.encode(seed, step))));
            _assertBooksBalance();
        }
    }

    function _randomStep(uint256 r) internal {
        address who = _who[r % 3];
        uint256 id = _ids[(r >> 4) % 2];
        uint256 action = (r >> 8) % 6;
        uint256 amount = bound(r >> 16, 1, 40e6);

        KoloPots.Member memory row = pots.memberOf(id, who);
        bool open = pots.potOf(id).status == KoloPots.Status.Open;

        vm.startPrank(who);
        if (action == 0 && !row.joined && open) {
            pots.join(id, amount);
        } else if (action == 1 && row.joined && open) {
            pots.topUp(id, amount);
        } else if (action == 2 && row.joined && open) {
            // Deliberately ask for more than may be available sometimes.
            uint256 units = bound(r >> 40, 1, 60);
            try pots.use(id, units) {} catch {}
        } else if (action == 3 && row.joined && pots.availableOf(id, who) > 0) {
            pots.withdraw(id);
        } else if (action == 4 && pots.potOf(id).creator == who && open) {
            pots.close(id);
        }
        vm.stopPrank();

        if (action == 5 && pots.earningsOf(premium) > 0) {
            vm.prank(premium);
            pots.withdrawEarnings();
        }
    }

    function _assertBooksBalance() internal view {
        uint256 unspent;
        for (uint256 p; p < 2; ++p) {
            uint256 potUsed;
            for (uint256 m; m < 3; ++m) {
                KoloPots.Member memory row = pots.memberOf(_ids[p], _who[m]);
                assertLe(row.used + row.withdrawn, row.contributed, "a member spent past their own share");
                unspent += row.contributed - row.used - row.withdrawn;
                potUsed += row.used;
            }
            assertEq(pots.potOf(_ids[p]).used, potUsed, "a pot's use does not add up");
        }
        assertEq(
            usd.balanceOf(address(pots)),
            unspent + pots.earningsOf(premium),
            "the contract does not hold exactly what it owes"
        );
    }
}
