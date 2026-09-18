// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {KoloGoals} from "../src/KoloGoals.sol";
import {KoloPots} from "../src/KoloPots.sol";
import {KoloRegistry} from "../src/KoloRegistry.sol";

/// @notice Deploys Goals and Pots against the live registry and the configured
///         dollar token. Separate from Deploy.s.sol because the registry and
///         router are already live and must not be replaced.
contract DeployPhase4 is Script {
    /// The KoloRegistry already live on Monad Testnet.
    address constant DEFAULT_REGISTRY = 0xA4D9181Bc7740d63df4783fF2C60EbB84F413212;
    /// Agora AUSD on Monad Testnet -- the app's dollar balance.
    address constant DEFAULT_TOKEN = 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC;

    function run() external returns (KoloGoals goals, KoloPots pots) {
        address registry = vm.envOr("KOLO_REGISTRY", DEFAULT_REGISTRY);
        address token = vm.envOr("KOLO_TOKEN", DEFAULT_TOKEN);

        vm.startBroadcast();
        goals = new KoloGoals(IERC20(token));
        pots = new KoloPots(KoloRegistry(registry), IERC20(token));
        vm.stopBroadcast();

        console.log("");
        console.log("=== Phase 4 deployed (chain id %s) ===", block.chainid);
        console.log("token     %s", token);
        console.log("registry  %s", registry);
        console.log("NEXT_PUBLIC_KOLO_GOALS_ADDRESS=%s", address(goals));
        console.log("NEXT_PUBLIC_KOLO_POTS_ADDRESS=%s", address(pots));
        console.log("");
    }
}
