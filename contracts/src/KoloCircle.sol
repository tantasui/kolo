// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {KoloRegistry} from "./KoloRegistry.sol";

/// @title KoloCircle
/// @notice Ajo / esusu, without the coordinator.
///
///         N people put in a fixed amount each round. One of them takes the
///         whole pot each round, rotating, until everyone has been paid. The
///         job a trusted human normally does -- collecting, chasing, deciding
///         who gets paid when someone is short -- is what this contract is.
///
/// @dev **The deposit is what removes the coordinator's discretion.**
///
///      Whoever is paid first has the most left to owe, so they post the most.
///      For a member joining at position `p` of `N`:
///
///          deposit(p) = max(1, N - 1 - p) * contribution
///
///      Take a member paid in round `p`. By then they have put in `p + 1`
///      contributions, and they still owe `N - 1 - p` for the rounds after.
///      Their deposit covers exactly that, so at the moment they hold the pot:
///
///          posted = (p + 1) * c + (N - 1 - p) * c = N * c = the pot
///
///      Nobody ever holds more than they have posted. The last position owes
///      nothing afterwards, so `max(1, ...)` still asks for one contribution:
///      a circle where the final member has nothing at stake is a circle with
///      a free rider.
///
///      **Nobody is ever thrown out.** A member who misses has the round drawn
///      from their deposit and is marked Behind. Behind members keep
///      contributing, and are passed over when their turn comes while what is
///      left of their deposit does not cover what they would still owe after
///      taking the pot. `cure()` puts the deposit back and returns them to the
///      rotation. There is no expulsion and no forfeiture anywhere in here.
///
///      That coverage test, not the Behind flag, is what decides who gets paid
///      -- because passing people over means payout order drifts from join
///      order, and a deposit sized for being paid last does not cover being
///      paid first.
///
///      **Money out never reverts the caller.** `payout`, deposit returns, and
///      `cancel` all move funds through `_send`, which credits the recipient
///      instead of reverting when the transfer fails -- a frozen or
///      blacklisted address is the practical case. `withdrawCredit` lets them
///      pull it once the transfer would succeed again, so one such address
///      can never brick the round for everybody else.
contract KoloCircle {
    using SafeERC20 for IERC20;

    error CircleNotFound();
    error CircleFull();
    error CircleNotForming();
    error CircleNotRunning();
    error AlreadyJoined();
    error NotAMember();
    error AlreadyContributed();
    error RoundStillOpen();
    error NothingToCure();
    error NoEligibleRecipient();
    error InvalidSize();
    error AmountZero();
    error InvalidToken();
    error InvalidDuration();
    error NameTooLong();
    error TooEarlyToCancel();
    error NothingToWithdraw();

    /// @notice Most people a circle can hold.
    /// @dev Payout scans members linearly, so the cap keeps that bounded. Eight
    ///      is also about as many people as actually run an ajo together.
    uint8 public constant MAX_MEMBERS = 8;
    uint8 public constant MIN_MEMBERS = 2;
    uint256 public constant MAX_NAME_BYTES = 40;
    /// @notice Shortest a round may run. Real circles run weekly or monthly;
    ///         this only exists so the 5-minute demo mode has a floor under it.
    uint64 public constant MIN_PERIOD = 5 minutes;
    /// @notice How long a circle may sit unfilled before anyone can wind it down.
    uint64 public constant CANCEL_AFTER = 7 days;

    enum Status {
        Forming,
        Running,
        Complete,
        Cancelled
    }

    struct Circle {
        address token;
        uint256 contribution;
        uint8 size;
        uint8 joined;
        /// @dev 0-based. A circle of N runs rounds 0..N-1.
        uint8 round;
        uint8 paidOut;
        uint64 roundEndsAt;
        uint64 roundDuration;
        uint64 createdAt;
        Status status;
        string name;
    }

    struct Member {
        address account;
        uint8 position;
        /// @notice What they posted on joining.
        uint256 deposit;
        /// @notice How much of that deposit has covered missed rounds.
        ///         Non-zero means Behind.
        uint256 depositDrawn;
        /// @notice Everything this member has actually put into the circle --
        ///         contributions they made, plus rounds their deposit covered.
        /// @dev A round nobody could cover raises neither this nor
        ///      `depositDrawn`, which is exactly how an unfunded round stays
        ///      visible: it leaves them permanently short of their full share.
        uint256 funded;
        bool received;
        /// @notice Set once the circle has handed this deposit back.
        /// @dev A flag rather than zeroing `depositDrawn`: overloading that
        ///      field to mean "returned" made a finished circle report every
        ///      member as owing a cure, and `cure` would take the money.
        bool depositReturned;
        /// @notice Which round paid them. Only meaningful once `received`.
        /// @dev Payouts happen one per round, but a Behind member is passed
        ///      over, so position order is not payout order. Recording the
        ///      round is the only way to say who took which pot without
        ///      replaying every log -- and the feed cannot, because the public
        ///      RPC only serves a 100-block window.
        uint8 paidInRound;
    }

    KoloRegistry public immutable registry;

    uint256 public circleCount;

    mapping(uint256 => Circle) internal _circles;
    mapping(uint256 => Member[]) internal _members;
    mapping(uint256 => mapping(address => uint8)) internal _indexOf;
    mapping(uint256 => mapping(address => bool)) internal _isMember;
    /// @dev circle => round => member => paid this round.
    mapping(uint256 => mapping(uint8 => mapping(address => bool))) internal _contributed;
    /// @dev circle => round => what was actually collected.
    mapping(uint256 => mapping(uint8 => uint256)) internal _collected;
    /// @notice token => account => balance a failed transfer left behind.
    mapping(address => mapping(address => uint256)) public creditOf;

    event CircleCreated(
        uint256 indexed circleId,
        address indexed creator,
        string creatorHandle,
        string name,
        address token,
        uint256 contribution,
        uint8 size,
        uint64 roundDuration
    );
    event MemberJoined(
        uint256 indexed circleId, address indexed account, string handle, uint8 position, uint256 deposit
    );
    event CircleStarted(uint256 indexed circleId, uint64 roundEndsAt);
    event Contributed(uint256 indexed circleId, address indexed account, uint8 round, uint256 amount, bool fromDeposit);
    event PaidOut(uint256 indexed circleId, address indexed recipient, string handle, uint8 round, uint256 amount);
    event FellBehind(uint256 indexed circleId, address indexed account, uint256 drawn);
    event Cured(uint256 indexed circleId, address indexed account, uint256 restored);
    event CircleCompleted(uint256 indexed circleId);
    event DepositReturned(uint256 indexed circleId, address indexed account, uint256 amount);
    event CircleCancelled(uint256 indexed circleId);
    event Credited(address indexed token, address indexed account, uint256 amount);
    event CreditWithdrawn(address indexed token, address indexed account, uint256 amount);

    constructor(KoloRegistry registry_) {
        registry = registry_;
    }

    /* ---------- forming ---------- */

    /// @notice Open a circle and take the first position.
    /// @dev The creator joins immediately: a circle with nobody in it is not a
    ///      thing anyone means to make.
    function create(string calldata name, address token, uint256 contribution, uint8 size, uint64 roundDuration)
        external
        returns (uint256 circleId)
    {
        if (size < MIN_MEMBERS || size > MAX_MEMBERS) revert InvalidSize();
        if (contribution == 0) revert AmountZero();
        if (token == address(0)) revert InvalidToken();
        if (roundDuration < MIN_PERIOD) revert InvalidDuration();
        if (bytes(name).length > MAX_NAME_BYTES) revert NameTooLong();

        circleId = ++circleCount;

        Circle storage circle = _circles[circleId];
        circle.token = token;
        circle.contribution = contribution;
        circle.size = size;
        circle.roundDuration = roundDuration;
        circle.createdAt = uint64(block.timestamp);
        circle.status = Status.Forming;
        circle.name = name;

        emit CircleCreated(
            circleId, msg.sender, registry.handleOf(msg.sender), name, token, contribution, size, roundDuration
        );

        _join(circleId);
    }

    /// @notice Take the next free position, posting its deposit.
    function join(uint256 circleId) external {
        _join(circleId);
    }

    function _join(uint256 circleId) internal {
        Circle storage circle = _circles[circleId];
        if (circle.size == 0) revert CircleNotFound();
        if (circle.status != Status.Forming) revert CircleNotForming();
        if (_isMember[circleId][msg.sender]) revert AlreadyJoined();
        if (circle.joined >= circle.size) revert CircleFull();

        uint8 position = circle.joined;
        uint256 deposit = depositFor(circle.size, position, circle.contribution);

        _members[circleId].push(
            Member({
                account: msg.sender,
                position: position,
                deposit: deposit,
                depositDrawn: 0,
                funded: 0,
                received: false,
                depositReturned: false,
                paidInRound: 0
            })
        );
        _indexOf[circleId][msg.sender] = position;
        _isMember[circleId][msg.sender] = true;
        circle.joined = position + 1;

        IERC20(circle.token).safeTransferFrom(msg.sender, address(this), deposit);

        emit MemberJoined(circleId, msg.sender, registry.handleOf(msg.sender), position, deposit);

        // The last one in starts the clock; nobody has to remember to.
        if (circle.joined == circle.size) {
            circle.status = Status.Running;
            circle.roundEndsAt = uint64(block.timestamp) + circle.roundDuration;
            emit CircleStarted(circleId, circle.roundEndsAt);
        }
    }

    /// @notice What position `p` of a circle of `size` must post.
    function depositFor(uint8 size, uint8 position, uint256 contribution) public pure returns (uint256) {
        uint256 rounds = size - 1 > position ? uint256(size - 1 - position) : 1;
        return rounds * contribution;
    }

    /* ---------- running ---------- */

    /// @notice Put in this round's contribution.
    function contribute(uint256 circleId) external {
        Circle storage circle = _circles[circleId];
        if (circle.status != Status.Running) revert CircleNotRunning();
        if (!_isMember[circleId][msg.sender]) revert NotAMember();
        if (_contributed[circleId][circle.round][msg.sender]) revert AlreadyContributed();

        _contributed[circleId][circle.round][msg.sender] = true;
        _collected[circleId][circle.round] += circle.contribution;
        _members[circleId][_indexOf[circleId][msg.sender]].funded += circle.contribution;

        IERC20(circle.token).safeTransferFrom(msg.sender, address(this), circle.contribution);

        emit Contributed(circleId, msg.sender, circle.round, circle.contribution, false);
    }

    /// @notice Close the round and pay whoever's turn it is.
    /// @dev Callable by anyone. Early once everyone has put in -- there is no
    ///      reason to make a circle wait on a clock it has already beaten --
    ///      and otherwise only after the deadline, when the members who did not
    ///      contribute have it drawn from their deposit.
    function payout(uint256 circleId) external {
        Circle storage circle = _circles[circleId];
        if (circle.status != Status.Running) revert CircleNotRunning();

        uint8 round = circle.round;
        Member[] storage members = _members[circleId];

        bool everyoneIn = _collected[circleId][round] == uint256(circle.size) * circle.contribution;
        if (!everyoneIn && block.timestamp < circle.roundEndsAt) revert RoundStillOpen();

        // Cover whoever is short out of their own deposit.
        if (!everyoneIn) {
            for (uint256 i; i < members.length; ++i) {
                Member storage member = members[i];
                if (_contributed[circleId][round][member.account]) continue;

                uint256 available = member.deposit - member.depositDrawn;
                uint256 drawn = available < circle.contribution ? available : circle.contribution;

                if (drawn != 0) {
                    member.depositDrawn += drawn;
                    member.funded += drawn;
                    _collected[circleId][round] += drawn;
                }

                _contributed[circleId][round][member.account] = true;

                emit Contributed(circleId, member.account, round, drawn, true);
                emit FellBehind(circleId, member.account, drawn);
            }
        }

        // Whoever is next in line and can afford to hold the pot.
        //
        // The ladder sizes deposits by join position, assuming position `p` is
        // paid in round `p`. Passing people over breaks that assumption --
        // skip enough members and somebody is paid earlier than their
        // position, holding a pot their deposit was never sized for. So
        // eligibility tests the thing the ladder was standing in for:
        //
        //     what you have put in + what is left of your deposit
        //         >= your whole share of the circle
        //
        // Hold that and taking the pot can never leave you ahead, whichever
        // round you take it in. It excludes a Behind member at their own turn,
        // lets them back in once they have made the shortfall good, and keeps
        // out anyone with a round nothing could cover.
        uint256 wholeShare = uint256(circle.size) * circle.contribution;
        uint256 recipient = type(uint256).max;
        for (uint256 i; i < members.length; ++i) {
            Member storage member = members[i];
            if (member.received) continue;
            if (member.funded + (member.deposit - member.depositDrawn) < wholeShare) continue;
            recipient = i;
            break;
        }
        if (recipient == type(uint256).max) revert NoEligibleRecipient();

        uint256 pot = _collected[circleId][round];
        Member storage paid = members[recipient];
        paid.received = true;
        paid.paidInRound = round;
        circle.paidOut += 1;

        _send(circle.token, paid.account, pot);
        emit PaidOut(circleId, paid.account, registry.handleOf(paid.account), round, pot);

        if (circle.paidOut == circle.size) {
            circle.status = Status.Complete;
            emit CircleCompleted(circleId);
            _returnDeposits(circleId);
        } else {
            circle.round = round + 1;
            circle.roundEndsAt = uint64(block.timestamp) + circle.roundDuration;
        }
    }

    /// @notice Put back what your deposit covered, and rejoin the rotation.
    function cure(uint256 circleId) external {
        Circle storage circle = _circles[circleId];
        // Only a running circle has a rotation to rejoin. Without this a
        // finished circle still accepts the money and never gives it back.
        if (circle.status != Status.Running) revert CircleNotRunning();
        if (!_isMember[circleId][msg.sender]) revert NotAMember();

        Member storage member = _members[circleId][_indexOf[circleId][msg.sender]];
        uint256 owed = member.depositDrawn;
        if (owed == 0) revert NothingToCure();

        member.depositDrawn = 0;

        IERC20(circle.token).safeTransferFrom(msg.sender, address(this), owed);

        emit Cured(circleId, msg.sender, owed);
    }

    /// @dev Whatever is left of each deposit goes home when the circle ends.
    function _returnDeposits(uint256 circleId) internal {
        Circle storage circle = _circles[circleId];
        Member[] storage members = _members[circleId];

        for (uint256 i; i < members.length; ++i) {
            Member storage member = members[i];
            if (member.depositReturned) continue;

            member.depositReturned = true;

            uint256 left = member.deposit - member.depositDrawn;
            if (left == 0) continue;

            _send(circle.token, member.account, left);
            emit DepositReturned(circleId, member.account, left);
        }
    }

    /// @notice Wind a circle down and give everyone back what the contract
    ///         still holds for them. Anyone may call.
    ///
    /// @dev Two circles need this, for the same reason: money must never have
    ///      no way out, and there is no coordinator to decide when to give up.
    ///
    ///      A **Forming** circle that never filled, a week after it opened.
    ///
    ///      A **Running** circle a week past a deadline it cannot clear. That
    ///      happens when every member still waiting to be paid is Behind:
    ///      `payout` has nobody it can pay and reverts, and because that revert
    ///      undoes the deposit draw, nothing is owed and `cure` reverts too. A
    ///      circle everybody walked away from would otherwise hold their
    ///      deposits for good.
    ///
    ///      What comes back is exact. Each member gets whatever is left of
    ///      their deposit, plus this round's contribution if they made it --
    ///      and for the round in progress that is always their own money,
    ///      since a draw only persists inside a `payout` that completed, and a
    ///      completed `payout` moves the round on.
    function cancel(uint256 circleId) external {
        Circle storage circle = _circles[circleId];
        if (circle.size == 0) revert CircleNotFound();

        if (circle.status == Status.Forming) {
            if (block.timestamp < circle.createdAt + CANCEL_AFTER) revert TooEarlyToCancel();
        } else if (circle.status == Status.Running) {
            if (block.timestamp < circle.roundEndsAt + CANCEL_AFTER) revert TooEarlyToCancel();
        } else {
            revert CircleNotForming();
        }

        uint8 round = circle.round;
        bool running = circle.status == Status.Running;
        circle.status = Status.Cancelled;

        Member[] storage members = _members[circleId];
        for (uint256 i; i < members.length; ++i) {
            Member storage member = members[i];

            uint256 amount;
            if (!member.depositReturned) {
                member.depositReturned = true;
                amount = member.deposit - member.depositDrawn;
            }
            if (running && _contributed[circleId][round][member.account]) {
                amount += circle.contribution;
            }
            if (amount == 0) continue;

            _send(circle.token, member.account, amount);
        }

        emit CircleCancelled(circleId);
    }

    /// @dev Pays `to` and, if the transfer fails, credits it instead of
    ///      reverting -- so a frozen or blacklisted recipient can never brick
    ///      a payout, a deposit return, or a cancellation for everyone else.
    function _send(address token, address to, uint256 amount) internal {
        if (amount == 0) return;

        (bool ok, bytes memory data) = token.call(abi.encodeCall(IERC20.transfer, (to, amount)));
        bool success = ok && (data.length == 0 || abi.decode(data, (bool)));

        if (success) return;

        creditOf[token][to] += amount;
        emit Credited(token, to, amount);
    }

    /// @notice Pull a balance a transfer once failed to deliver to you.
    function withdrawCredit(address token) external {
        uint256 amount = creditOf[token][msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        creditOf[token][msg.sender] = 0;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit CreditWithdrawn(token, msg.sender, amount);
    }

    /* ---------- reading ---------- */

    function circleOf(uint256 circleId) external view returns (Circle memory) {
        return _circles[circleId];
    }

    function membersOf(uint256 circleId) external view returns (Member[] memory) {
        return _members[circleId];
    }

    function isMember(uint256 circleId, address account) external view returns (bool) {
        return _isMember[circleId][account];
    }

    /// @notice True once `account` has put in for the circle's current round.
    function hasContributed(uint256 circleId, address account) external view returns (bool) {
        return _contributed[circleId][_circles[circleId].round][account];
    }

    /// @notice What has been gathered for the current round.
    function collectedThisRound(uint256 circleId) external view returns (uint256) {
        return _collected[circleId][_circles[circleId].round];
    }

    /// @notice Non-zero means Behind: how much they must `cure`.
    /// @dev Zero unless the circle is running, so nothing can offer a cure on
    ///      a circle that has no rotation left to rejoin.
    function amountToCure(uint256 circleId, address account) external view returns (uint256) {
        if (_circles[circleId].status != Status.Running) return 0;
        if (!_isMember[circleId][account]) return 0;
        return _members[circleId][_indexOf[circleId][account]].depositDrawn;
    }
}
