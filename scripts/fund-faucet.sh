#!/usr/bin/env bash
# Top up Kolo's demo faucet with AUSD.
#
# Agora's faucet pays 10,000 AUSD per request, which is far too much to hand a
# demo user directly. So we draw from Agora into the deploy account and stock
# KoloFaucet, which pays users a normal-looking $100 at a time.
#
#   ./scripts/fund-faucet.sh            # draw from Agora, move it all across
#   ./scripts/fund-faucet.sh 2500       # move 2500 AUSD across, no Agora draw
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$ROOT/contracts/.env" ]; then
  echo "error: contracts/.env is missing. Copy contracts/.env.example and set PRIVATE_KEY." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/contracts/.env"
[ -f "$ROOT/web/.env.local" ] && source "$ROOT/web/.env.local"
set +a

RPC="${MONAD_RPC_URL:-https://testnet-rpc.monad.xyz}"
AUSD="${NEXT_PUBLIC_TOKEN_ADDRESS:-0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC}"
KOLO_FAUCET="${NEXT_PUBLIC_KOLO_FAUCET_ADDRESS:?set NEXT_PUBLIC_KOLO_FAUCET_ADDRESS in web/.env.local}"
AGORA_FAUCET="${AGORA_FAUCET_ADDRESS:-0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C}"

ME=$(cast wallet address --private-key "$PRIVATE_KEY")
units() { cast call "$AUSD" 'balanceOf(address)(uint256)' "$1" --rpc-url "$RPC" | awk '{print $1}'; }
dollars() { python3 -c "print(f'{int($1)/1e6:,.2f}')"; }

echo "deploy account : $ME"
echo "Kolo faucet    : $KOLO_FAUCET"
echo

if [ $# -eq 0 ]; then
  echo "Drawing from Agora's faucet…"
  if cast send "$AGORA_FAUCET" 'requestFunds(address)' "$ME" \
       --private-key "$PRIVATE_KEY" --rpc-url "$RPC" >/dev/null 2>&1; then
    echo "  drew 10,000 AUSD"
  else
    echo "  skipped (rate limited — the deploy account drew recently)"
  fi
  # Leave a little behind so the account can still pay for its own test sends.
  BAL=$(units "$ME")
  AMOUNT=$(python3 -c "print(max(0, int($BAL) - 100_000000))")
else
  AMOUNT=$(python3 -c "print(int(float('$1') * 1e6))")
fi

if [ "$AMOUNT" -le 0 ]; then
  echo "Nothing to move; the deploy account holds $(dollars "$(units "$ME")") AUSD." >&2
  exit 1
fi

echo "Moving $(dollars "$AMOUNT") AUSD into the faucet…"
cast send "$AUSD" 'transfer(address,uint256)' "$KOLO_FAUCET" "$AMOUNT" \
  --private-key "$PRIVATE_KEY" --rpc-url "$RPC" >/dev/null

RESERVE=$(units "$KOLO_FAUCET")
DRIPS=$(cast call "$KOLO_FAUCET" 'dripsRemaining()(uint256)' --rpc-url "$RPC" | awk '{print $1}')

echo
echo "Faucet reserve : $(dollars "$RESERVE") AUSD"
echo "Covers         : $DRIPS more taps of Add demo funds"
