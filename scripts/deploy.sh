#!/usr/bin/env bash
# Deploy the Kolo contracts to Monad Testnet and write the resulting addresses
# into web/.env.local, so the app picks them up with no manual copying.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS="$ROOT/contracts"
CHAIN_ID=10143

if [ ! -f "$CONTRACTS/.env" ]; then
  echo "error: contracts/.env is missing. Copy contracts/.env.example and set PRIVATE_KEY." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$CONTRACTS/.env"
set +a

: "${PRIVATE_KEY:?set PRIVATE_KEY in contracts/.env}"
RPC="${MONAD_RPC_URL:-https://testnet-rpc.monad.xyz}"

DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY")
BALANCE=$(cast balance "$DEPLOYER" --rpc-url "$RPC")

echo "Deployer : $DEPLOYER"
echo "Balance  : $(cast from-wei "$BALANCE") MON"

if [ "$BALANCE" = "0" ]; then
  echo
  echo "This account has no testnet funds. Claim some at https://testnet.monad.xyz" >&2
  echo "for $DEPLOYER, then run this script again." >&2
  exit 1
fi

cd "$CONTRACTS"
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC" \
  --private-key "$PRIVATE_KEY" \
  --broadcast

RUN="$CONTRACTS/broadcast/Deploy.s.sol/$CHAIN_ID/run-latest.json"
address_of() {
  jq -r --arg name "$1" \
    '.transactions[] | select(.contractName == $name) | .contractAddress' "$RUN" | head -1
}

REGISTRY=$(address_of KoloRegistry)
PAY=$(address_of KoloPay)
TOKEN=$(address_of TestUSD)
BLOCK=$(jq -r '[.receipts[].blockNumber] | min' "$RUN" | xargs -I{} cast to-dec {} 2>/dev/null || echo 0)

ENV_FILE="$ROOT/web/.env.local"
[ -f "$ENV_FILE" ] || cp "$ROOT/web/.env.example" "$ENV_FILE"

set_var() {
  local key="$1" value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    # `|` as the delimiter: addresses never contain one.
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

set_var NEXT_PUBLIC_KOLO_REGISTRY_ADDRESS "$REGISTRY"
set_var NEXT_PUBLIC_KOLO_PAY_ADDRESS "$PAY"
set_var NEXT_PUBLIC_TEST_USD_ADDRESS "$TOKEN"
set_var NEXT_PUBLIC_KOLO_DEPLOY_BLOCK "$BLOCK"

cat <<EOF

Deployed to Monad Testnet, and written into web/.env.local:

  NEXT_PUBLIC_KOLO_REGISTRY_ADDRESS=$REGISTRY
  NEXT_PUBLIC_KOLO_PAY_ADDRESS=$PAY
  NEXT_PUBLIC_TEST_USD_ADDRESS=$TOKEN
  NEXT_PUBLIC_KOLO_DEPLOY_BLOCK=$BLOCK

Still to fill in by hand: NEXT_PUBLIC_PRIVY_APP_ID and
NEXT_PUBLIC_PIMLICO_BUNDLER_URL. See the README.
EOF
