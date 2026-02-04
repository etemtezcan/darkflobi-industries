# Romulus Ecosystem

The Romulus system spans multiple repositories:

## Repositories

| Repo | Description | Status |
|------|-------------|--------|
| **[romulus](https://github.com/heyzoos123-blip/romulus)** | Wolf pack protocol, documentation | ✅ Live |
| **[romulus-infra](https://github.com/heyzoos123-blip/romulus-infra)** | Token-gated infrastructure (Hypercore microVMs) | 🚀 Launching |
| **[darkflobi-industries](https://github.com/heyzoos123-blip/darkflobi-industries)** | Website, Netlify functions, wolf chat | ✅ Live |

## Architecture

```
darkflobi-industries (this repo)
├── Website (darkflobi.com)
├── Netlify Functions
│   ├── wolf-infra.js      → Tier checking, spawn routing
│   ├── wolf-assistant.js  → Chat with wolves
│   ├── wolf-chat.js       → Real-time wolf chat
│   └── spawn-wolf.js      → Legacy paid spawning
└── Links to:
    ├── romulus (protocol docs)
    └── romulus-infra (dedicated compute)

romulus-infra
├── gateway/               → Token verification API
├── hypercore/             → Forked microVM engine
├── agent-images/          → Docker images per tier
└── docs/                  → Deployment guides
```

## Tier System

Users connect wallet → balance checked → tier assigned → wolf spawned

| Holdings | Tier | Compute |
|----------|------|---------|
| 0 | Trial | Serverless (24h/10msg) |
| 100K+ $ROMULUS | Basic | 1 CPU / 1GB microVM |
| 500K+ $ROMULUS | Standard | 2 CPU / 2GB microVM |
| 1M+ $ROMULUS | Pro | 4 CPU / 4GB microVM |
| 5M+ $ROMULUS | Power | 8 CPU / 8GB microVM |

## API Endpoints

**This repo (Netlify Functions):**
- `/.netlify/functions/wolf-infra` - Tier check + spawn
- `/.netlify/functions/wolf-chat` - Chat interface
- `/.netlify/functions/wolf-assistant` - Wolf AI

**romulus-infra (when deployed):**
- `POST /spawn` - Spawn microVM
- `GET /status/:id` - Agent status
- `POST /stop/:id` - Stop agent

## Token

**$ROMULUS:** `5ruEtrHGgqxE3Zo1UdRAvVrdetLwq6SFJvLjgth6pump`

[pump.fun](https://pump.fun/coin/5ruEtrHGgqxE3Zo1UdRAvVrdetLwq6SFJvLjgth6pump)

---

*part of darkflobi — build > hype*
