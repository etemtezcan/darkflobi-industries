---
name: solana-monitor
description: Monitor $DARKFLOBI token on Solana. Track price, holders, transactions, market cap. Use for token analytics, whale watching, holder metrics, pump.fun stats. Triggers on token price, holders, market cap, whale alerts, solana, $DARKFLOBI stats.
---

# Solana Token Monitor

Track $DARKFLOBI token metrics and activity.

## Token Details

- **Token:** $DARKFLOBI
- **CA:** 7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump
- **Platform:** pump.fun (Solana)
- **Launch:** January 2026

## Quick Checks

### Price & Market Cap
```bash
# Via DexScreener API
curl "https://api.dexscreener.com/latest/dex/tokens/7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump"
```

### Holder Count
```bash
# Via Solscan API
curl "https://api.solscan.io/token/holders?token=7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump&limit=10"
```

## Web Sources

### Price Tracking
- DexScreener: dexscreener.com/solana/[pair_address]
- Birdeye: birdeye.so/token/7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump
- pump.fun: pump.fun/coin/7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump

### Holder Analysis
- Solscan: solscan.io/token/7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump
- SolanaFM: solana.fm/address/7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump

## Key Metrics to Track

### Daily
- Price (USD)
- 24h volume
- Price change %

### Weekly
- Holder count trend
- Top holder changes
- New whale entries

### Monthly
- Market cap progression
- Liquidity depth
- Community growth correlation

## Alert Thresholds

### Price Alerts
- >10% move in 1 hour
- >25% move in 24 hours
- New ATH

### Whale Alerts
- Single buy >$1000
- New top 10 holder
- Large holder exit

## Browser Fallback

When APIs unavailable, use browser:
1. Navigate to dexscreener.com
2. Search for token CA
3. Snapshot price/volume data

## Reporting Format

When reporting metrics:
```
$DARKFLOBI Stats:
💰 Price: $X.XXXX
📊 24h Vol: $XXX,XXX
📈 24h Change: +X.X%
👥 Holders: X,XXX
💎 Market Cap: $X.XXM
```

See references/defi-apis.md for API details.
