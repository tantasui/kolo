// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {KoloPay} from "../src/KoloPay.sol";
import {KoloRegistry} from "../src/KoloRegistry.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract KoloPayTest is Test {
    KoloRegistry internal registry;
    KoloPay internal pay;
    TestUSD internal usd;

    address internal amara = makeAddr("amara");
    address internal tunde = makeAddr("tunde");
    address internal stranger = makeAddr("stranger");

    event Sent(
        address indexed from,
        address indexed to,
        string fromHandle,
        string toHandle,
        address token,
        uint256 amount,
        string memo
    );

    function setUp() public {
        vm.warp(1_700_000_000);
        registry = new KoloRegistry();
        pay = new KoloPay(registry);
        usd = new TestUSD();

        vm.startPrank(amara);
        registry.register("amara");
        usd.faucet();
        usd.approve(address(pay), type(uint256).max);
        vm.stopPrank();

        vm.prank(tunde);
        registry.register("tunde");
    }

    // --- happy paths ---

    function test_SendMovesTokensToHandleOwner() public {
        vm.prank(amara);
        pay.sendToHandle("tunde", address(usd), 10e6, "lunch");

        assertEq(usd.balanceOf(amara), 90e6);
        assertEq(usd.balanceOf(tunde), 10e6);
    }

    function test_SendEmitsSentWithBothHandles() public {
        vm.expectEmit(true, true, false, true);
        emit Sent(amara, tunde, "amara", "tunde", address(usd), 10e6, "lunch");

        vm.prank(amara);
        pay.sendToHandle("tunde", address(usd), 10e6, "lunch");
    }

    function test_SendWorksWithEmptyMemo() public {
        vm.prank(amara);
        pay.sendToHandle("tunde", address(usd), 1e6, "");

        assertEq(usd.balanceOf(tunde), 1e6);
    }

    function test_SendAcceptsMemoAtMaxLength() public {
        string memory memo = _repeat("a", pay.MAX_MEMO_BYTES());

        vm.prank(amara);
        pay.sendToHandle("tunde", address(usd), 1e6, memo);

        assertEq(usd.balanceOf(tunde), 1e6);
    }

    function test_UnregisteredSenderEmitsEmptyFromHandle() public {
        vm.startPrank(stranger);
        usd.faucet();
        usd.approve(address(pay), type(uint256).max);

        vm.expectEmit(true, true, false, true);
        emit Sent(stranger, tunde, "", "tunde", address(usd), 5e6, "");
        pay.sendToHandle("tunde", address(usd), 5e6, "");
        vm.stopPrank();
    }

    function test_ExactApprovalIsConsumed() public {
        vm.startPrank(stranger);
        usd.faucet();
        usd.approve(address(pay), 5e6);
        pay.sendToHandle("tunde", address(usd), 5e6, "");
        vm.stopPrank();

        assertEq(usd.allowance(stranger, address(pay)), 0);
        assertEq(usd.balanceOf(tunde), 5e6);
    }

    function test_RegistryIsExposed() public view {
        assertEq(address(pay.registry()), address(registry));
    }

    // --- reverts ---

    function test_RevertWhen_HandleNotRegistered() public {
        vm.prank(amara);
        vm.expectRevert(KoloPay.HandleNotFound.selector);
        pay.sendToHandle("ghost", address(usd), 10e6, "");
    }

    function test_RevertWhen_AmountIsZero() public {
        vm.prank(amara);
        vm.expectRevert(KoloPay.AmountZero.selector);
        pay.sendToHandle("tunde", address(usd), 0, "");
    }

    function test_RevertWhen_TokenIsZeroAddress() public {
        vm.prank(amara);
        vm.expectRevert(KoloPay.InvalidToken.selector);
        pay.sendToHandle("tunde", address(0), 10e6, "");
    }

    function test_RevertWhen_SendingToSelf() public {
        vm.prank(amara);
        vm.expectRevert(KoloPay.SelfSend.selector);
        pay.sendToHandle("amara", address(usd), 10e6, "");
    }

    function test_RevertWhen_MemoTooLong() public {
        string memory memo = _repeat("a", pay.MAX_MEMO_BYTES() + 1);

        vm.prank(amara);
        vm.expectRevert(KoloPay.MemoTooLong.selector);
        pay.sendToHandle("tunde", address(usd), 1e6, memo);
    }

    function test_RevertWhen_AllowanceMissing() public {
        vm.startPrank(stranger);
        usd.faucet();
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(pay), 0, 1e6));
        pay.sendToHandle("tunde", address(usd), 1e6, "");
        vm.stopPrank();
    }

    function test_RevertWhen_BalanceInsufficient() public {
        vm.prank(amara);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, amara, 100e6, 500e6));
        pay.sendToHandle("tunde", address(usd), 500e6, "");
    }

    function test_RevertWhen_HandleCaseDoesNotMatch() public {
        // Handles are lowercase-only; "Tunde" was never registered.
        vm.prank(amara);
        vm.expectRevert(KoloPay.HandleNotFound.selector);
        pay.sendToHandle("Tunde", address(usd), 1e6, "");
    }

    // --- the batched approve+send the app actually performs ---

    function test_ApproveThenSendInSameTransaction() public {
        vm.startPrank(stranger);
        usd.faucet();
        // mirrors the single batched user operation issued by the smart account
        usd.approve(address(pay), 25e6);
        pay.sendToHandle("tunde", address(usd), 25e6, "rent");
        vm.stopPrank();

        assertEq(usd.balanceOf(tunde), 25e6);
        assertEq(usd.balanceOf(stranger), 75e6);
    }

    function testFuzz_SendTransfersExactAmount(uint256 amount, string calldata memo) public {
        amount = bound(amount, 1, 100e6);
        vm.assume(bytes(memo).length <= pay.MAX_MEMO_BYTES());

        vm.prank(amara);
        pay.sendToHandle("tunde", address(usd), amount, memo);

        assertEq(usd.balanceOf(tunde), amount);
        assertEq(usd.balanceOf(amara), 100e6 - amount);
    }

    function _repeat(string memory ch, uint256 n) internal pure returns (string memory out) {
        for (uint256 i; i < n; ++i) {
            out = string.concat(out, ch);
        }
    }
}
