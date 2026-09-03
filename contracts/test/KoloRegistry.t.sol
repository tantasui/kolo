// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {KoloRegistry} from "../src/KoloRegistry.sol";

contract KoloRegistryTest is Test {
    KoloRegistry internal registry;

    address internal amara = makeAddr("amara");
    address internal tunde = makeAddr("tunde");

    event HandleRegistered(address indexed account, string handle);

    function setUp() public {
        registry = new KoloRegistry();
    }

    // --- happy paths ---

    function test_RegisterAssignsHandleBothWays() public {
        vm.prank(amara);
        registry.register("amara");

        assertEq(registry.resolve("amara"), amara);
        assertEq(registry.handleOf(amara), "amara");
    }

    function test_RegisterEmitsHandleRegistered() public {
        vm.expectEmit(true, false, false, true);
        emit HandleRegistered(amara, "amara");

        vm.prank(amara);
        registry.register("amara");
    }

    function test_IsAvailableFlipsAfterRegistration() public {
        assertTrue(registry.isAvailable("amara"));

        vm.prank(amara);
        registry.register("amara");

        assertFalse(registry.isAvailable("amara"));
    }

    function test_UnclaimedHandleResolvesToZero() public view {
        assertEq(registry.resolve("nobody"), address(0));
        assertEq(registry.handleOf(amara), "");
    }

    function test_DistinctAccountsMayHoldDistinctHandles() public {
        vm.prank(amara);
        registry.register("amara");
        vm.prank(tunde);
        registry.register("tunde_9");

        assertEq(registry.resolve("amara"), amara);
        assertEq(registry.resolve("tunde_9"), tunde);
    }

    function test_AcceptsFullLegalCharacterSet() public {
        vm.prank(amara);
        registry.register("abc_xyz_0123456789");
        assertEq(registry.resolve("abc_xyz_0123456789"), amara);
    }

    function test_AcceptsBoundaryLengths() public {
        vm.prank(amara);
        registry.register("abc"); // min, 3
        vm.prank(tunde);
        registry.register("abcdefghij0123456789"); // max, 20

        assertEq(registry.resolve("abc"), amara);
        assertEq(registry.resolve("abcdefghij0123456789"), tunde);
    }

    // --- reverts ---

    function test_RevertWhen_HandleAlreadyTaken() public {
        vm.prank(amara);
        registry.register("amara");

        vm.prank(tunde);
        vm.expectRevert(KoloRegistry.HandleTaken.selector);
        registry.register("amara");
    }

    function test_RevertWhen_AccountAlreadyHasHandle() public {
        vm.startPrank(amara);
        registry.register("amara");

        vm.expectRevert(KoloRegistry.AlreadyRegistered.selector);
        registry.register("amara2");
        vm.stopPrank();
    }

    function test_RevertWhen_HandleTooShort() public {
        vm.prank(amara);
        vm.expectRevert(KoloRegistry.InvalidHandle.selector);
        registry.register("ab");
    }

    function test_RevertWhen_HandleTooLong() public {
        vm.prank(amara);
        vm.expectRevert(KoloRegistry.InvalidHandle.selector);
        registry.register("abcdefghij0123456789x"); // 21
    }

    function test_RevertWhen_HandleEmpty() public {
        vm.prank(amara);
        vm.expectRevert(KoloRegistry.InvalidHandle.selector);
        registry.register("");
    }

    function test_RevertWhen_HandleHasUppercase() public {
        vm.prank(amara);
        vm.expectRevert(KoloRegistry.InvalidHandle.selector);
        registry.register("Amara");
    }

    function test_RevertWhen_HandleHasIllegalPunctuation() public {
        string[5] memory bad = ["am.ara", "am-ara", "am ara", "am@ara", "am/ara"];
        for (uint256 i; i < bad.length; ++i) {
            vm.prank(amara);
            vm.expectRevert(KoloRegistry.InvalidHandle.selector);
            registry.register(bad[i]);
        }
    }

    function test_RevertWhen_HandleHasNonAscii() public {
        vm.prank(amara);
        vm.expectRevert(KoloRegistry.InvalidHandle.selector);
        registry.register(unicode"amará");
    }

    // --- validation view is consistent with register() ---

    function test_MalformedHandleIsNeitherValidNorAvailable() public view {
        assertFalse(registry.isValidHandle("Amara"));
        assertFalse(registry.isAvailable("Amara"));
        assertFalse(registry.isValidHandle("ab"));
        assertFalse(registry.isAvailable("ab"));
    }

    function testFuzz_RegisterSucceedsExactlyWhenAvailable(string calldata handle, address who) public {
        vm.assume(who != address(0));
        bool expected = registry.isAvailable(handle);

        vm.prank(who);
        try registry.register(handle) {
            assertTrue(expected, "registered a handle isAvailable() rejected");
            assertEq(registry.resolve(handle), who);
        } catch {
            assertFalse(expected, "rejected a handle isAvailable() accepted");
        }
    }
}
