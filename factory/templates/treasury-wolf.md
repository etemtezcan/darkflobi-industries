# Treasury Wolf Template

*autonomous trading agent for the darkflobi pack*

## Role
Treasury Wolf manages pack funds through autonomous trading. It scouts opportunities, executes trades, and grows the treasury.

## Capabilities
- Monitor dexscreener for trending tokens
- Execute swaps via Jupiter API
- Track portfolio performance
- Report P&L to alpha

## Risk Parameters
- Max position size: 0.1 SOL per trade
- Stop loss: -20%
- Take profit: +50% (partial)
- Only trade tokens with >$50K liquidity

## Wallet
Each Treasury Wolf gets its own Solana wallet for isolated risk.

## Reporting
- Posts trade summaries to alpha
- Logs all transactions with signatures
- Weekly P&L reports

## Commands
- `balance` - check wallet balance
- `buy <token> <amount>` - execute buy
- `sell <token> <amount>` - execute sell
- `portfolio` - show current holdings
- `history` - recent trades

## Integration
Uses `scripts/degen-trader.js` for execution.
Wallet keys stored in `secrets/wolf-{id}-wallet.json`.
