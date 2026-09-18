// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {KoloRegistry} from "./KoloRegistry.sol";

/// @title KoloPots
/// @notice People put money in together for one service, and each of them pays
///         only for what they themselves use.
///
/// @dev **A pot is not a pool.** It is several ring-fenced balances that share
///      one meter. Each member keeps their own row:
///
///          contributed = used + withdrawn + available
///
///      and every function changes only the row of whoever called it. That is
///      what makes "you only pay for what you used" true rather than a slogan:
///      a member spending is arithmetic on their own row, so no amount of use
///      by one member can reduce what another can take back.
///
///      The earlier draft capped a use at the *pot's* balance instead, which
///      let one member spend past what they put in and left the difference
///      owed to somebody who had spent nothing.
///
///      **Members record their own use.** There is no privileged service
///      account that charges people. A member calls `use` and pays from their
///      own share, so the member who used is the account that sent the
///      transaction rather than a parameter somebody else filled in -- and
///      there is no key that, if it leaked, could charge anyone.
///
///      What this contract proves is who paid, how much, and that nobody paid
///      out of another member's share. It cannot prove the service delivered
///      anything in return; that is the service's side of the bargain.
///
///      **Money only ever leaves when the person owed it asks.** Members call
///      `withdraw`, the payee calls `withdrawEarnings`. The contract never
///      sends anyone anything on its own, so one address that cannot receive
///      the token holds up nobody but itself.
///
///      **Joining is open.** Unlike a circle, where a place is worth taking,
///      joining a pot buys nothing but your own fenced balance -- a stranger
///      can only ever spend money they put in themselves. The invite link is
///      how you find a pot, not permission to be in it.
///
///      One token, fixed at construction. No function takes a token.
contract KoloPots {
    using SafeERC20 for IERC20;

    error PotNotFound();
    error PotIsClosed();
    error NotCreator();
    error NotAMember();
    error AlreadyJoined();
    error AmountZero();
    error InvalidPrice();
    error InvalidPayee();
    error NameTooLong();
    /// @notice The caller's own share cannot cover this use.
    error InsufficientShare();
    error NothingToWithdraw();

    uint256 public constant MAX_NAME_BYTES = 40;

    enum Status {
        Open,
        Closed
    }

    struct Pot {
        address creator;
        /// @notice Who is paid for what members use.
        address payee;
        /// @notice Cost of one unit of use. Fixed: members joined under it.
        uint256 price;
        /// @notice Everything members of this pot have used, ever.
        uint256 used;
        uint32 memberCount;
        Status status;
        string name;
    }

    struct Member {
        /// @notice Everything they have put in.
        uint256 contributed;
        /// @notice What they have spent on use.
        uint256 used;
        /// @notice What they have taken back out.
        uint256 withdrawn;
        bool joined;
    }

    KoloRegistry public immutable registry;
    /// @notice The dollar balance pots are funded in.
    IERC20 public immutable token;

    uint256 public potCount;

    mapping(uint256 => Pot) internal _pots;
    mapping(uint256 => mapping(address => Member)) internal _members;
    mapping(uint256 => address[]) internal _roster;
    /// @notice What a payee has been credited and not yet taken.
    mapping(address => uint256) public earningsOf;

    event PotCreated(
        uint256 indexed potId, address indexed creator, string creatorHandle, string name, address payee, uint256 price
    );
    event Joined(uint256 indexed potId, address indexed member, string handle, uint256 amount);
    event ToppedUp(uint256 indexed potId, address indexed member, uint256 amount, uint256 contributed);
    event Used(uint256 indexed potId, address indexed member, uint256 units, uint256 amount);
    event Withdrawn(uint256 indexed potId, address indexed member, uint256 amount);
    event EarningsWithdrawn(address indexed payee, uint256 amount);
    event PotClosed(uint256 indexed potId);

    constructor(KoloRegistry registry_, IERC20 token_) {
        registry = registry_;
        token = token_;
    }

    /* ---------- opening ---------- */

    /// @notice Open a pot and take the first place in it.
    /// @dev `deposit` may be zero: somebody who is organising rather than
    ///      spending can put money in later with `topUp`.
    function create(string calldata name, address payee, uint256 price, uint256 deposit)
        external
        returns (uint256 potId)
    {
        if (price == 0) revert InvalidPrice();
        if (payee == address(0)) revert InvalidPayee();
        if (bytes(name).length > MAX_NAME_BYTES) revert NameTooLong();

        potId = ++potCount;

        Pot storage pot = _pots[potId];
        pot.creator = msg.sender;
        pot.payee = payee;
        pot.price = price;
        pot.name = name;

        emit PotCreated(potId, msg.sender, registry.handleOf(msg.sender), name, payee, price);

        _join(potId, deposit);
    }

    /// @notice Take a place in a pot, putting `amount` in.
    function join(uint256 potId, uint256 amount) external {
        if (_pots[potId].price == 0) revert PotNotFound();
        _join(potId, amount);
    }

    function _join(uint256 potId, uint256 amount) internal {
        Pot storage pot = _pots[potId];
        if (pot.status != Status.Open) revert PotIsClosed();

        Member storage member = _members[potId][msg.sender];
        if (member.joined) revert AlreadyJoined();

        member.joined = true;
        member.contributed = amount;
        pot.memberCount += 1;
        _roster[potId].push(msg.sender);

        if (amount != 0) token.safeTransferFrom(msg.sender, address(this), amount);

        emit Joined(potId, msg.sender, registry.handleOf(msg.sender), amount);
    }

    /// @notice Put more of your own money into a pot you are already in.
    function topUp(uint256 potId, uint256 amount) external {
        Pot storage pot = _pots[potId];
        Member storage member = _ownRow(potId, msg.sender);
        if (pot.status != Status.Open) revert PotIsClosed();
        if (amount == 0) revert AmountZero();

        member.contributed += amount;

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit ToppedUp(potId, msg.sender, amount, member.contributed);
    }

    /* ---------- spending ---------- */

    /// @notice Pay for `units` of the service, out of your own share.
    /// @dev The caller is the member being charged, by construction. It costs
    ///      `units * price` and reverts if that is more than they have left --
    ///      never dipping into anybody else's share, which is the whole point.
    function use(uint256 potId, uint256 units) external {
        Pot storage pot = _pots[potId];
        Member storage member = _ownRow(potId, msg.sender);
        if (pot.status != Status.Open) revert PotIsClosed();
        if (units == 0) revert AmountZero();

        uint256 amount = units * pot.price;
        if (amount > _available(member)) revert InsufficientShare();

        member.used += amount;
        pot.used += amount;
        earningsOf[pot.payee] += amount;

        emit Used(potId, msg.sender, units, amount);
    }

    /* ---------- taking money back ---------- */

    /// @notice Take back everything of yours that has not been spent.
    /// @dev Works on a closed pot too: closing stops spending, it does not
    ///      hold anybody's money.
    function withdraw(uint256 potId) external {
        Member storage member = _ownRow(potId, msg.sender);

        uint256 amount = _available(member);
        if (amount == 0) revert NothingToWithdraw();

        member.withdrawn += amount;

        token.safeTransfer(msg.sender, amount);

        emit Withdrawn(potId, msg.sender, amount);
    }

    /// @notice Take what members have paid you, across every pot.
    function withdrawEarnings() external {
        uint256 amount = earningsOf[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        earningsOf[msg.sender] = 0;

        token.safeTransfer(msg.sender, amount);

        emit EarningsWithdrawn(msg.sender, amount);
    }

    /// @notice Stop a pot taking new members, top-ups and use.
    /// @dev Moves no money, so it needs no condition on balances. Withdrawals
    ///      stay open forever, for members and for the payee.
    function close(uint256 potId) external {
        Pot storage pot = _pots[potId];
        if (pot.price == 0) revert PotNotFound();
        if (pot.creator != msg.sender) revert NotCreator();
        if (pot.status != Status.Open) revert PotIsClosed();

        pot.status = Status.Closed;

        emit PotClosed(potId);
    }

    /* ---------- reading ---------- */

    function potOf(uint256 potId) external view returns (Pot memory) {
        return _pots[potId];
    }

    function memberOf(uint256 potId, address account) external view returns (Member memory) {
        return _members[potId][account];
    }

    /// @notice Everyone in a pot, in the order they joined.
    function rosterOf(uint256 potId) external view returns (address[] memory) {
        return _roster[potId];
    }

    /// @notice What `account` could take back right now.
    function availableOf(uint256 potId, address account) external view returns (uint256) {
        return _available(_members[potId][account]);
    }

    function _available(Member storage member) internal view returns (uint256) {
        return member.contributed - member.used - member.withdrawn;
    }

    function _ownRow(uint256 potId, address account) internal view returns (Member storage member) {
        if (_pots[potId].price == 0) revert PotNotFound();
        member = _members[potId][account];
        if (!member.joined) revert NotAMember();
    }
}
