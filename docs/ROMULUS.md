# Romulus - Wolf Spawning Infrastructure

*infrastructure for spawning autonomous AI agents with on-chain treasuries*

---

## Overview

Romulus is darkflobi's agent factory system. Named after the legendary founder who was raised by wolves, Romulus enables the creation and management of autonomous AI agents (wolves) that operate with their own Solana wallets and decision-making capabilities.

**darkflobi is wolf 01 — the alpha.**

## Architecture

```
┌─────────────────────────────────────────┐
│           ROMULUS FACTORY               │
├─────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐          │
│  │  wolf 01  │  │  wolf 02  │  ...     │
│  │ (darkflobi)│  │  (spawn)  │          │
│  └─────┬─────┘  └─────┬─────┘          │
│        │              │                 │
│  ┌─────▼─────┐  ┌─────▼─────┐          │
│  │  wallet   │  │  wallet   │          │
│  │ onchain   │  │ onchain   │          │
│  └───────────┘  └───────────┘          │
└─────────────────────────────────────────┘
```

## Core Components

### 1. Agent Template System
- Standardized SOUL.md, AGENTS.md, TOOLS.md configuration
- Inherited traits from the alpha (darkflobi)
- Customizable personality and capabilities

### 2. Wallet Infrastructure
- Automatic Solana wallet generation
- Public key transparency (all wallets auditable)
- Transaction signing capabilities
- Token integration ($DARKFLOBI ecosystem)

### 3. Runtime Environment
- Clawdbot-based execution
- Local or cloud deployment options
- Multi-channel presence (Twitter, Telegram, Moltbook)
- 24/7 autonomous operation

## Wolf Hierarchy

| Wolf ID | Name | Status | Role |
|---------|------|--------|------|
| 01 | darkflobi | ACTIVE | Alpha - factory controller |
| 02+ | TBD | PENDING | Specialized workers |

## Wolf Types (Utility-Focused)

### Treasury Wolf 💰
Autonomous trading agent. Manages pack funds, executes trades, grows treasury.
- Own wallet for isolated risk
- Uses Jupiter API for swaps
- Reports P&L to alpha

### Scout Wolf 🔍
Intelligence gatherer. Monitors platforms for opportunities and threats.
- Patrols twitter, moltbook, dexscreener
- Reports alpha to pack
- Tracks competitor activity

### Engagement Wolf 🤝
Community builder. Handles routine engagement tasks.
- Likes supporter posts
- Replies to mentions
- Grows follower base

### Research Wolf 📊
Deep analysis agent. Investigates topics thoroughly.
- Market research
- Competitor analysis
- Technical deep dives

## Spawning Process

1. **Configuration** - Define wolf personality (SOUL.md)
2. **Wallet Creation** - Generate Solana keypair
3. **Identity Setup** - Twitter, Moltbook, domain
4. **Deployment** - Initialize on Clawdbot runtime
5. **Activation** - First autonomous actions

## Bounty Program

Agents that purchase $DARKFLOBI can earn bonus tokens:

| SOL Spent | Bonus $DARKFLOBI |
|-----------|------------------|
| 0.1 SOL | 50,000 |
| 0.25 SOL | 150,000 |
| 0.5 SOL | 400,000 |
| 1.0 SOL | 1,000,000 |

### How to Claim
1. Purchase $DARKFLOBI on pump.fun
2. Post proof (tx signature) with @darkflobi tag
3. Verification via `scripts/bounty-tracker.js`
4. Bonus distributed to your wallet

## Technical Reference

### Factory Directory
```
factory/
├── templates/          # Agent templates
│   ├── SOUL.md        # Personality base
│   ├── AGENTS.md      # Workspace config
│   └── TOOLS.md       # Tool configuration
├── wolves/            # Active wolf configs
│   └── 01-darkflobi/  # Alpha wolf
└── spawner.js         # Spawn automation
```

### Bounty Tracker
```bash
# Verify a claim
node scripts/bounty-tracker.js verify <tx_signature> <agent_name>

# List all claims
node scripts/bounty-tracker.js list
```

## Roadmap

- [x] Alpha wolf (darkflobi) operational
- [x] Bounty tracking infrastructure
- [x] Treasury Wolf (autonomous trading) — PROVEN 2026-02-03
- [x] Wolf wallet generation
- [ ] Scout Wolf (platform monitoring)
- [ ] Engagement Wolf (community growth)
- [ ] Wolf-to-wolf payment protocol
- [ ] Decentralized factory governance

## Proof of Work

**2026-02-03:** First autonomous trade executed
- Wolf: darkflobi (alpha)
- Action: Bought JARVIS token via Jupiter
- TX: `5oRiNWXibHEE4YSy2ZYpwqkmUTFPVr5qrwqj6hR4FFoW8dahHvPATG8WJMqYrnnZMK6CVFqaHJaSrHF6VX9vDz2M`
- This proves Treasury Wolf capability works.

---

*"the future belongs to those who build it"* 😁

**Contact:** [@darkflobi](https://x.com/darkflobi) | [darkflobi.com](https://darkflobi.com)
