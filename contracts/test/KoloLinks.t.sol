// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {KoloLinks} from "../src/KoloLinks.sol";
import {KoloRegistry} from "../src/KoloRegistry.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract KoloLinksTest is Test {
    KoloRegistry internal registry;
    KoloLinks internal links;
    TestUSD internal usd;

    address internal amara = makeAddr("amara");
    address internal tunde = makeAddr("tunde");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant SECRET = keccak256("a 32-byte secret from the sender's device");
    bytes32 internal secretHash;

    event LinkCreated(
        bytes32 indexed secretHash,
        address indexed sender,
        string senderHandle,
        address token,
        uint256 amount,
        string memo,
        uint64 expiresAt
    );
    event LinkClaimed(bytes32 indexed secretHash, address indexed recipient, address token, uint256 amount);
    event LinkReclaimed(bytes32 indexed secretHash, address indexed sender, uint256 amount, bool afterExpiry);

    function setUp() public {
        vm.warp(1_700_000_000);
        registry = new KoloRegistry();
        links = new KoloLinks(registry);
        usd = new TestUSD();

        secretHash = keccak256(abi.encodePacked(SECRET));

        vm.startPrank(amara);
        registry.register("amara");
        usd.faucet();
        usd.approve(address(links), type(uint256).max);
        vm.stopPrank();
    }

    // --- creating ---

    function test_CreateEscrowsTheMoney() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "lunch");

        assertEq(usd.balanceOf(amara), 75e6);
        assertEq(usd.balanceOf(address(links)), 25e6);
    }

    function test_CreateRecordsTheLink() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "lunch");

        KoloLinks.Link memory link = links.linkOf(secretHash);
        assertEq(link.sender, amara);
        assertEq(link.token, address(usd));
        assertEq(link.amount, 25e6);
        assertEq(link.createdAt, uint64(block.timestamp));
        assertEq(link.expiresAt, uint64(block.timestamp + links.LINK_LIFETIME()));
        assertTrue(links.isLive(secretHash));
        assertTrue(links.isClaimable(secretHash));
    }

    function test_CreateEmitsLinkCreatedWithSenderHandle() public {
        vm.expectEmit(true, true, false, true);
        emit LinkCreated(
            secretHash, amara, "amara", address(usd), 25e6, "lunch", uint64(block.timestamp + links.LINK_LIFETIME())
        );

        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "lunch");
    }

    function test_UnregisteredSenderGetsEmptyHandle() public {
        vm.startPrank(stranger);
        usd.faucet();
        usd.approve(address(links), type(uint256).max);

        vm.expectEmit(true, true, false, true);
        emit LinkCreated(
            secretHash, stranger, "", address(usd), 5e6, "", uint64(block.timestamp + links.LINK_LIFETIME())
        );
        links.create(secretHash, address(usd), 5e6, "");
        vm.stopPrank();
    }

    function test_CreateAcceptsMemoAtMaxLength() public {
        string memory memo = _repeat("a", links.MAX_MEMO_BYTES());

        vm.prank(amara);
        links.create(secretHash, address(usd), 1e6, memo);

        assertTrue(links.isLive(secretHash));
    }

    function test_HashOfMatchesTheClientSideHash() public view {
        assertEq(links.hashOf(SECRET), secretHash);
    }

    /// Known-answer test against the browser.
    ///
    /// This pair was produced by web/src/lib/claimLink.ts and cross-checked
    /// with `cast keccak`. If the client and the contract ever disagree on how
    /// a secret is hashed, money is parked behind a hash nobody can claim, and
    /// nothing else in this suite would notice -- every other test hashes with
    /// Solidity on both sides, which is circular.
    function test_HashMatchesAVectorFromTheBrowser() public view {
        bytes32 fromBrowser = 0x96ab893d1b4505c73bcb97204b3049018e9d48e945c892065d7561a10a6a98a4;
        bytes32 expected = 0x8b4b05498de28550948e1eb511c00760edf16c9580e1771c5f85de62a72cec50;

        assertEq(links.hashOf(fromBrowser), expected);
    }

    function test_UnknownHashIsNotLive() public view {
        assertFalse(links.isLive(keccak256("never used")));
    }

    // --- creating: reverts ---

    function test_RevertWhen_CreateAmountIsZero() public {
        vm.prank(amara);
        vm.expectRevert(KoloLinks.AmountZero.selector);
        links.create(secretHash, address(usd), 0, "");
    }

    function test_RevertWhen_CreateTokenIsZero() public {
        vm.prank(amara);
        vm.expectRevert(KoloLinks.InvalidToken.selector);
        links.create(secretHash, address(0), 1e6, "");
    }

    function test_RevertWhen_CreateMemoTooLong() public {
        string memory memo = _repeat("a", links.MAX_MEMO_BYTES() + 1);

        vm.prank(amara);
        vm.expectRevert(KoloLinks.MemoTooLong.selector);
        links.create(secretHash, address(usd), 1e6, memo);
    }

    function test_RevertWhen_SecretHashReused() public {
        vm.startPrank(amara);
        links.create(secretHash, address(usd), 10e6, "");

        vm.expectRevert(KoloLinks.LinkExists.selector);
        links.create(secretHash, address(usd), 10e6, "");
        vm.stopPrank();
    }

    function test_RevertWhen_CreateWithoutAllowance() public {
        vm.startPrank(stranger);
        usd.faucet();
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(links), 0, 1e6)
        );
        links.create(secretHash, address(usd), 1e6, "");
        vm.stopPrank();
    }

    // --- claiming ---

    function test_ClaimPaysTheRecipient() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "lunch");

        links.claim(SECRET, tunde);

        assertEq(usd.balanceOf(tunde), 25e6);
        assertEq(usd.balanceOf(address(links)), 0);
    }

    function test_ClaimClearsTheLink() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        links.claim(SECRET, tunde);

        assertFalse(links.isLive(secretHash));
        assertEq(links.linkOf(secretHash).amount, 0);
    }

    function test_ClaimEmitsLinkClaimed() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.expectEmit(true, true, false, true);
        emit LinkClaimed(secretHash, tunde, address(usd), 25e6);
        links.claim(SECRET, tunde);
    }

    /// A fresh account holds no gas, so someone else submits the claim for it.
    function test_AnyoneMaySubmitAClaimForSomeoneElse() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.prank(stranger);
        links.claim(SECRET, tunde);

        assertEq(usd.balanceOf(tunde), 25e6);
        assertEq(usd.balanceOf(stranger), 0);
    }

    function test_SecretHashIsFreeAgainAfterClaim() public {
        vm.startPrank(amara);
        links.create(secretHash, address(usd), 10e6, "");
        vm.stopPrank();

        links.claim(SECRET, tunde);

        vm.prank(amara);
        links.create(secretHash, address(usd), 10e6, "again");
        assertTrue(links.isLive(secretHash));
    }

    // --- claiming: reverts ---

    function test_RevertWhen_ClaimingWithTheWrongSecret() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.expectRevert(KoloLinks.LinkNotFound.selector);
        links.claim(keccak256("not the secret"), tunde);
    }

    function test_RevertWhen_ClaimingTwice() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");
        links.claim(SECRET, tunde);

        vm.expectRevert(KoloLinks.LinkNotFound.selector);
        links.claim(SECRET, tunde);
    }

    function test_RevertWhen_ClaimingToZeroAddress() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.expectRevert(KoloLinks.ZeroRecipient.selector);
        links.claim(SECRET, address(0));
    }

    // --- reclaiming ---

    function test_SenderCanReclaimAnUnclaimedLink() public {
        vm.startPrank(amara);
        links.create(secretHash, address(usd), 25e6, "");
        links.reclaim(secretHash);
        vm.stopPrank();

        assertEq(usd.balanceOf(amara), 100e6);
        assertFalse(links.isLive(secretHash));
    }

    function test_ReclaimEmitsLinkReclaimed() public {
        vm.startPrank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.expectEmit(true, true, false, true);
        emit LinkReclaimed(secretHash, amara, 25e6, false);
        links.reclaim(secretHash);
        vm.stopPrank();
    }

    function test_RevertWhen_SomeoneElseReclaims() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.prank(stranger);
        vm.expectRevert(KoloLinks.NotSender.selector);
        links.reclaim(secretHash);
    }

    function test_RevertWhen_ReclaimingAClaimedLink() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");
        links.claim(SECRET, tunde);

        vm.prank(amara);
        vm.expectRevert(KoloLinks.LinkNotFound.selector);
        links.reclaim(secretHash);
    }

    function test_RevertWhen_ReclaimingUnknownLink() public {
        vm.prank(amara);
        vm.expectRevert(KoloLinks.LinkNotFound.selector);
        links.reclaim(keccak256("never used"));
    }

    // --- expiry ---

    function test_ClaimableUpToTheInstantBeforeExpiry() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.warp(block.timestamp + links.LINK_LIFETIME() - 1);
        assertTrue(links.isClaimable(secretHash));

        links.claim(SECRET, tunde);
        assertEq(usd.balanceOf(tunde), 25e6);
    }

    function test_RevertWhen_ClaimingExactlyAtExpiry() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.warp(block.timestamp + links.LINK_LIFETIME());

        vm.expectRevert(KoloLinks.LinkExpired.selector);
        links.claim(SECRET, tunde);
    }

    function test_RevertWhen_ClaimingLongAfterExpiry() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.warp(block.timestamp + 365 days);

        vm.expectRevert(KoloLinks.LinkExpired.selector);
        links.claim(SECRET, tunde);
    }

    /// Expiry closes claiming; it never destroys the money.
    function test_ExpiredLinkIsStillLiveAndStillReclaimable() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.warp(block.timestamp + links.LINK_LIFETIME());

        assertTrue(links.isLive(secretHash), "money is still parked");
        assertFalse(links.isClaimable(secretHash), "but nobody can claim it");

        vm.prank(amara);
        links.reclaim(secretHash);
        assertEq(usd.balanceOf(amara), 100e6);
    }

    function test_ReclaimAfterExpiryFlagsItInTheEvent() public {
        vm.prank(amara);
        links.create(secretHash, address(usd), 25e6, "");

        vm.warp(block.timestamp + links.LINK_LIFETIME());

        vm.expectEmit(true, true, false, true);
        emit LinkReclaimed(secretHash, amara, 25e6, true);
        vm.prank(amara);
        links.reclaim(secretHash);
    }

    function test_UnknownHashIsNotClaimable() public view {
        assertFalse(links.isClaimable(keccak256("never used")));
    }

    // --- the batched approve+create the app actually performs ---

    function test_ApproveThenCreateInSameTransaction() public {
        vm.startPrank(stranger);
        usd.faucet();
        // mirrors the single batched user operation issued by the smart account
        usd.approve(address(links), 30e6);
        links.create(secretHash, address(usd), 30e6, "here you go");
        vm.stopPrank();

        assertEq(usd.balanceOf(address(links)), 30e6);
        assertEq(usd.balanceOf(stranger), 70e6);
    }

    function test_ConcurrentLinksAreIndependent() public {
        bytes32 otherSecret = keccak256("a different secret");
        bytes32 otherHash = keccak256(abi.encodePacked(otherSecret));

        vm.startPrank(amara);
        links.create(secretHash, address(usd), 10e6, "one");
        links.create(otherHash, address(usd), 15e6, "two");
        vm.stopPrank();

        links.claim(SECRET, tunde);

        assertEq(usd.balanceOf(tunde), 10e6);
        assertTrue(links.isLive(otherHash));
        assertEq(usd.balanceOf(address(links)), 15e6);
    }

    function testFuzz_AnySecretRoundTrips(bytes32 secret, uint256 amount) public {
        amount = bound(amount, 1, 100e6);
        bytes32 hashed = keccak256(abi.encodePacked(secret));

        vm.prank(amara);
        links.create(hashed, address(usd), amount, "");

        assertEq(links.hashOf(secret), hashed);

        links.claim(secret, tunde);
        assertEq(usd.balanceOf(tunde), amount);
    }

    function _repeat(string memory ch, uint256 n) internal pure returns (string memory out) {
        for (uint256 i; i < n; ++i) {
            out = string.concat(out, ch);
        }
    }

    function test_RevertWhen_SecretHashIsZero() public {
        // keccak256 never returns zero, so a link keyed on zero could never be
        // claimed -- refuse it at creation rather than stranding the money.
        vm.prank(amara);
        vm.expectRevert(KoloLinks.InvalidSecretHash.selector);
        links.create(bytes32(0), address(usd), 10e6, "");
    }
}
