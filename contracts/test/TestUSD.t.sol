// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract TestUSDTest is Test {
    TestUSD internal usd;

    address internal amara = makeAddr("amara");
    address internal tunde = makeAddr("tunde");

    event FaucetDrawn(address indexed account, uint256 amount);

    function setUp() public {
        usd = new TestUSD();
        vm.warp(1_700_000_000); // avoid timestamp 0, where last==0 is ambiguous
    }

    // --- metadata ---

    function test_UsesSixDecimals() public view {
        assertEq(usd.decimals(), 6);
    }

    function test_StartsWithZeroSupply() public view {
        assertEq(usd.totalSupply(), 0);
    }

    // --- faucet happy paths ---

    function test_FaucetMintsHundredDollars() public {
        vm.prank(amara);
        usd.faucet();

        assertEq(usd.balanceOf(amara), 100e6);
        assertEq(usd.totalSupply(), 100e6);
    }

    function test_FaucetEmitsFaucetDrawn() public {
        vm.expectEmit(true, false, false, true);
        emit FaucetDrawn(amara, 100e6);

        vm.prank(amara);
        usd.faucet();
    }

    function test_FaucetCooldownIsPerAddress() public {
        vm.prank(amara);
        usd.faucet();

        // tunde is unaffected by amara's draw
        vm.prank(tunde);
        usd.faucet();

        assertEq(usd.balanceOf(tunde), 100e6);
    }

    function test_FaucetAvailableAgainAfterAnHour() public {
        vm.prank(amara);
        usd.faucet();

        vm.warp(block.timestamp + 1 hours);
        vm.prank(amara);
        usd.faucet();

        assertEq(usd.balanceOf(amara), 200e6);
    }

    // --- faucet reverts ---

    function test_RevertWhen_FaucetCalledTwiceImmediately() public {
        vm.startPrank(amara);
        usd.faucet();
        uint256 readyAt = block.timestamp + 1 hours;

        vm.expectRevert(abi.encodeWithSelector(TestUSD.FaucetCooldown.selector, readyAt));
        usd.faucet();
        vm.stopPrank();
    }

    function test_RevertWhen_FaucetCalledOneSecondEarly() public {
        vm.startPrank(amara);
        usd.faucet();
        uint256 readyAt = block.timestamp + 1 hours;

        vm.warp(readyAt - 1);
        vm.expectRevert(abi.encodeWithSelector(TestUSD.FaucetCooldown.selector, readyAt));
        usd.faucet();
        vm.stopPrank();
    }

    // --- cooldown view ---

    function test_CooldownRemainingIsZeroBeforeFirstDraw() public view {
        assertEq(usd.faucetCooldownRemaining(amara), 0);
    }

    function test_CooldownRemainingCountsDown() public {
        vm.prank(amara);
        usd.faucet();

        assertEq(usd.faucetCooldownRemaining(amara), 1 hours);
        vm.warp(block.timestamp + 20 minutes);
        assertEq(usd.faucetCooldownRemaining(amara), 40 minutes);
        vm.warp(block.timestamp + 40 minutes);
        assertEq(usd.faucetCooldownRemaining(amara), 0);
    }

    // --- erc20 behaviour ---

    function test_TransferMovesBalance() public {
        vm.startPrank(amara);
        usd.faucet();
        usd.transfer(tunde, 25e6);
        vm.stopPrank();

        assertEq(usd.balanceOf(amara), 75e6);
        assertEq(usd.balanceOf(tunde), 25e6);
    }
}
