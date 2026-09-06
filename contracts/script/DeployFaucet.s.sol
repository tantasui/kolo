// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {KoloFaucet} from "../src/KoloFaucet.sol";

/// @notice Deploys the demo faucet for whichever token the app is using.
/// @dev Separate from Deploy.s.sol because the registry and router are already
///      live and must not be redeployed.
contract DeployFaucet is Script {
    /// Agora AUSD on Monad Testnet.
    address constant DEFAULT_TOKEN = 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC;

    function run() external returns (KoloFaucet faucet) {
        address token = vm.envOr("FAUCET_TOKEN", DEFAULT_TOKEN);
        // 100 dollars, in the token's own units (AUSD and TestUSD are both 6dp).
        uint256 dripAmount = vm.envOr("FAUCET_DRIP_AMOUNT", uint256(100e6));
        uint256 cooldown = vm.envOr("FAUCET_COOLDOWN", uint256(1 hours));

        vm.startBroadcast();
        faucet = new KoloFaucet(IERC20(token), dripAmount, cooldown);
        vm.stopBroadcast();

        console.log("");
        console.log("=== KoloFaucet deployed (chain id %s) ===", block.chainid);
        console.log("token       %s", token);
        console.log("dripAmount  %s", dripAmount);
        console.log("cooldown    %s seconds", cooldown);
        console.log("NEXT_PUBLIC_KOLO_FAUCET_ADDRESS=%s", address(faucet));
        console.log("");
        console.log("Top it up with: ./scripts/fund-faucet.sh");
        console.log("");
    }
}
