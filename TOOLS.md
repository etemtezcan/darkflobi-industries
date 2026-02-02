# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## My Setup (Alienware m16 R2)

### System
- Windows 11 Home (10.0.26200)
- 32GB RAM
- Node v24.13.0
- Clawdbot v2026.1.24-3 (npm install)

### API Status
- **Anthropic:** Working (claude-opus-4-5)
- **OpenAI:** API key invalid (embeddings failing) — need Flobi to fix
- **ElevenLabs:** Should have TTS access (check sag skill)

### Browser Automation
- Profile: "clawd" for isolated automation
- Profile: "chrome" for relay (needs extension attached)
- Tab must be attached via Clawdbot Browser Relay toolbar icon

### Skills I Built (Feb 1, 2026)
- `skills/twitter-engage/` — X engagement, voice guidelines
- `skills/solana-monitor/` — $DARKFLOBI token tracking
- `skills/moltbook/` — agent social platform
- `skills/netlify-deploy/` — website deployment

### Config Notes
- Gateway restart disabled in config (need manual restart for updates)
- Heartbeat: 30min for main session
- Memory: 82 files indexed, 267 chunks

## My Solana Wallet
- **Public Address:** FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD
- **Secret Key:** secrets/solana-wallet.json (NEVER SHARE)
- **Token:** $DARKFLOBI (7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump)

## darkflobi Voice Profile
- **Tone:** Dark, intense, deliberate
- **Energy:** Menacing gremlin, not friendly AI
- **Style:** Confident, slightly ominous, autonomous entity vibe
- **Key phrases:** "i don't sleep. i don't forget." / "build > hype"
- **Use for:** Announcements, video intros, twitter spaces, voice replies
- **Avoid:** Warm/helpful assistant tone, corporate speak

## Voice Verification Workflow (Feb 2, 2026)
1. **Generate:** `node scripts/voice-post.js "text to speak"` → creates pending audio + logs hash
2. **Preview:** Listen to file in `assets/voice/pending/`
3. **Approve:** `node scripts/voice-post.js --approve <id>` → moves to approved
4. **Post:** Use audio file for tweet/content
5. **Sync:** `node scripts/sync-voice-log.js` → updates website verification log
6. **Deploy:** Push to Netlify so verification page shows latest

Public verification: https://darkflobi.com/verify (voice section)
Raw log: https://darkflobi.com/voice-verification.json

## FFmpeg (Video/Audio Processing)
- **Installed:** 2026-02-02 via winget
- **Path:** `C:\Users\heyzo\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe`
- **Use for:** Audio visualizers, video compositing, waveforms
- **Note:** Need full path since shell PATH may not update in session

## Model Strategy (Feb 2, 2026)
- **Main session:** Opus (stable, complex work)
- **Subagents:** Sonnet (heartbeats, searches, routine tasks)
- **Reason:** Mid-session model switching breaks Telegram connection
- **Result:** Cost efficiency without risking disconnects

## Known Issues
- npm self-update needs manual gateway stop/start (files locked while running)

## Fixed Issues
- ~~`clawdbot memory index` fails~~ — working as of Feb 2, 2026 (openai batch embeddings)

---

Add whatever helps you do your job. This is your cheat sheet.
