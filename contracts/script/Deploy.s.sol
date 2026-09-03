// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {KoloRegistry} from "../src/KoloRegistry.sol";
import {KoloPay} from "../src/KoloPay.sol";
import {TestUSD} from "../src/TestUSD.sol";

/// @notice Deploys the full Kolo contract set and prints the addresses to
///         paste into web/src/config.ts.
contract Deploy is Script {
    function run() external returns (KoloRegistry registry, KoloPay pay, TestUSD usd) {
        vm.startBroadcast();

        registry = new KoloRegistry();
        pay = new KoloPay(registry);
        usd = new TestUSD();

        vm.stopBroadcast();

        console.log("");
        console.log("=== Kolo deployed (chain id %s) ===", block.chainid);
        console.log("NEXT_PUBLIC_KOLO_REGISTRY_ADDRESS=%s", address(registry));
        console.log("NEXT_PUBLIC_KOLO_PAY_ADDRESS=%s", address(pay));
        console.log("NEXT_PUBLIC_TEST_USD_ADDRESS=%s", address(usd));
        console.log("");
    }
}
