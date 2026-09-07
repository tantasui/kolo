// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {KoloLinks} from "../src/KoloLinks.sol";
import {KoloRegistry} from "../src/KoloRegistry.sol";

/// @notice Deploys the claim-link contract against the live registry.
/// @dev Separate from Deploy.s.sol because the registry and router are already
///      deployed and must not be replaced.
contract DeployLinks is Script {
    /// The KoloRegistry already live on Monad Testnet.
    address constant DEFAULT_REGISTRY = 0xA4d9181Bc7740D63dF4783fF2c60EBB84F413212;

    function run() external returns (KoloLinks links) {
        address registry = vm.envOr("KOLO_REGISTRY", DEFAULT_REGISTRY);

        vm.startBroadcast();
        links = new KoloLinks(KoloRegistry(registry));
        vm.stopBroadcast();

        console.log("");
        console.log("=== KoloLinks deployed (chain id %s) ===", block.chainid);
        console.log("registry  %s", registry);
        console.log("NEXT_PUBLIC_KOLO_LINKS_ADDRESS=%s", address(links));
        console.log("");
        console.log("Put that in web/.env.local, then restart the dev server.");
        console.log("");
    }
}
