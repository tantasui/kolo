// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {KoloFaucet} from "../src/KoloFaucet.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract KoloFaucetTest is Test {
    KoloFaucet internal faucet;
    TestUSD internal usd;

    address internal owner = address(this);
    address internal amara = makeAddr("amara");
    address internal tunde = makeAddr("tunde");

    uint256 internal constant DRIP = 100e6;
    uint256 internal constant COOLDOWN = 1 hours;

    event Dripped(address indexed recipient, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function setUp() public {
        vm.warp(1_700_000_000);
        usd = new TestUSD();
        faucet = new KoloFaucet(IERC20(address(usd)), DRIP, COOLDOWN);
        _fund(1000e6);
    }

    /// Stock the reserve the way we do in production: plain transfers in.
    function _fund(uint256 amount) internal {
        uint256 drawn;
        while (drawn < amount) {
            usd.faucet();
            drawn += 100e6;
            vm.warp(block.timestamp + 1 hours);
        }
        usd.transfer(address(faucet), amount);
    }

    // --- configuration ---

    function test_ExposesItsConfiguration() public view {
        assertEq(address(faucet.token()), address(usd));
        assertEq(faucet.dripAmount(), DRIP);
        assertEq(faucet.cooldown(), COOLDOWN);
        assertEq(faucet.owner(), owner);
    }

    // --- happy paths ---

    function test_DripPaysTheRecipientNotTheCaller() public {
        // tunde calls on amara's behalf; amara gets the money.
        vm.prank(tunde);
        faucet.drip(amara);

        assertEq(usd.balanceOf(amara), DRIP);
        assertEq(usd.balanceOf(tunde), 0);
    }

    function test_DripEmitsDripped() public {
        vm.expectEmit(true, false, false, true);
        emit Dripped(amara, DRIP);

        faucet.drip(amara);
    }

    function test_DripDrawsDownTheReserve() public {
        faucet.drip(amara);
        assertEq(usd.balanceOf(address(faucet)), 900e6);
    }

    function test_CooldownIsPerRecipient() public {
        faucet.drip(amara);
        faucet.drip(tunde);

        assertEq(usd.balanceOf(amara), DRIP);
        assertEq(usd.balanceOf(tunde), DRIP);
    }

    function test_DripAvailableAgainAfterCooldown() public {
        faucet.drip(amara);
        vm.warp(block.timestamp + COOLDOWN);
        faucet.drip(amara);

        assertEq(usd.balanceOf(amara), 2 * DRIP);
    }

    function test_DripsRemainingTracksReserve() public {
        assertEq(faucet.dripsRemaining(), 10);
        faucet.drip(amara);
        assertEq(faucet.dripsRemaining(), 9);
    }

    // --- reverts ---

    function test_RevertWhen_DrippedTwiceImmediately() public {
        faucet.drip(amara);
        uint256 readyAt = block.timestamp + COOLDOWN;

        vm.expectRevert(abi.encodeWithSelector(KoloFaucet.CooldownActive.selector, readyAt));
        faucet.drip(amara);
    }

    function test_RevertWhen_DrippedOneSecondEarly() public {
        faucet.drip(amara);
        uint256 readyAt = block.timestamp + COOLDOWN;

        vm.warp(readyAt - 1);
        vm.expectRevert(abi.encodeWithSelector(KoloFaucet.CooldownActive.selector, readyAt));
        faucet.drip(amara);
    }

    function test_RevertWhen_RecipientIsZero() public {
        vm.expectRevert(KoloFaucet.ZeroRecipient.selector);
        faucet.drip(address(0));
    }

    function test_RevertWhen_ReserveCannotCoverADrip() public {
        faucet.withdraw(owner, usd.balanceOf(address(faucet)) - (DRIP - 1));

        vm.expectRevert(KoloFaucet.FaucetEmpty.selector);
        faucet.drip(amara);
    }

    function test_ReserveOfExactlyOneDripStillWorks() public {
        faucet.withdraw(owner, usd.balanceOf(address(faucet)) - DRIP);
        faucet.drip(amara);

        assertEq(usd.balanceOf(amara), DRIP);
        assertEq(faucet.dripsRemaining(), 0);
    }

    // --- cooldown view ---

    function test_CooldownRemainingCountsDown() public {
        assertEq(faucet.cooldownRemaining(amara), 0);
        faucet.drip(amara);

        assertEq(faucet.cooldownRemaining(amara), COOLDOWN);
        vm.warp(block.timestamp + 20 minutes);
        assertEq(faucet.cooldownRemaining(amara), 40 minutes);
        vm.warp(block.timestamp + 40 minutes);
        assertEq(faucet.cooldownRemaining(amara), 0);
    }

    // --- ownership ---

    function test_OwnerCanWithdraw() public {
        uint256 before = usd.balanceOf(owner);
        faucet.withdraw(owner, 250e6);
        assertEq(usd.balanceOf(owner) - before, 250e6);
    }

    function test_RevertWhen_NonOwnerWithdraws() public {
        vm.prank(amara);
        vm.expectRevert(KoloFaucet.NotOwner.selector);
        faucet.withdraw(amara, 1e6);
    }

    function test_RevertWhen_NonOwnerTransfersOwnership() public {
        vm.prank(amara);
        vm.expectRevert(KoloFaucet.NotOwner.selector);
        faucet.transferOwnership(amara);
    }

    function test_RevertWhen_OwnershipTransferredToZero() public {
        vm.expectRevert(KoloFaucet.ZeroOwner.selector);
        faucet.transferOwnership(address(0));
    }

    function test_TransferOwnershipMovesControl() public {
        vm.expectEmit(true, true, false, false);
        emit OwnershipTransferred(owner, amara);
        faucet.transferOwnership(amara);

        assertEq(faucet.owner(), amara);

        vm.prank(amara);
        faucet.withdraw(amara, 1e6);
        assertEq(usd.balanceOf(amara), 1e6);
    }

    function testFuzz_DripIsAlwaysExactlyDripAmount(address recipient) public {
        vm.assume(recipient != address(0) && recipient != address(faucet));
        uint256 before = usd.balanceOf(recipient);

        faucet.drip(recipient);

        assertEq(usd.balanceOf(recipient) - before, DRIP);
    }
}
