# Wolf Chat Setup Guide

Web chat interface where visitors can talk to the wolf on darkflobi.com.

## Architecture

```
[visitor] → [darkflobi.com/wolf-chat.js] → [Netlify Function] → [Cloudflare Tunnel] → [Local Wolf Server] → [Anthropic API]
```

## Components

1. **Frontend Widget** (`darkflobi-site/wolf-chat.js`)
   - Terminal-style chat UI
   - Client-side rate limiting (20 msg/hour)
   - Auto-embedded in index.html

2. **Netlify Function** (`darkflobi-site/netlify/functions/wolf-chat.js`)
   - Server-side rate limiting
   - Proxies to wolf backend via WOLF_API_URL

3. **Wolf Chat Server** (`scripts/wolf-chat-server.js`)
   - Node.js HTTP server
   - Calls Anthropic API with wolf persona
   - Maintains conversation context per IP

## Setup Steps

### 1. Install Cloudflare Tunnel (one-time)

```powershell
winget install Cloudflare.cloudflared
```

### 2. Start the Wolf Server

```powershell
cd C:\Users\heyzo\clawd
$env:ANTHROPIC_API_KEY = "your-key-here"  # or use existing from env
node scripts/wolf-chat-server.js
```

Server runs on port 3456 by default.

### 3. Start Cloudflare Tunnel

In a new terminal:

```powershell
cloudflared tunnel --url http://localhost:3456
```

You'll get a URL like: `https://random-words.trycloudflare.com`

### 4. Configure Netlify Environment Variables

In Netlify dashboard → Site settings → Environment variables:

- `WOLF_API_URL` = `https://your-tunnel-url.trycloudflare.com`
- `WOLF_API_TOKEN` = (optional, set if you want auth)

### 5. Deploy to Netlify

```powershell
cd C:\Users\heyzo\clawd\darkflobi-site
netlify deploy --prod
```

## Running as a Service (Optional)

To keep wolf server running persistently:

### Option A: PM2

```powershell
npm install -g pm2
pm2 start scripts/wolf-chat-server.js --name wolf-chat
pm2 save
pm2 startup
```

### Option B: Windows Task Scheduler

Create a task that runs `node scripts/wolf-chat-server.js` at startup.

### Option C: Docker

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY scripts/wolf-chat-server.js .
ENV ANTHROPIC_API_KEY=your-key
CMD ["node", "wolf-chat-server.js"]
```

## Cloudflare Named Tunnel (Recommended for Production)

Instead of random URLs, create a named tunnel:

```powershell
# Login to Cloudflare
cloudflared tunnel login

# Create named tunnel
cloudflared tunnel create wolf-chat

# Configure DNS (in Cloudflare dashboard or CLI)
cloudflared tunnel route dns wolf-chat wolf.darkflobi.com

# Run with config
cloudflared tunnel run wolf-chat
```

Then set `WOLF_API_URL = https://wolf.darkflobi.com`

## Rate Limits

- Client-side: 20 messages/hour (localStorage)
- Server-side (Netlify): 20 messages/hour per IP
- Both reset after 1 hour

## Customization

### Change Wolf Persona

Edit `WOLF_SYSTEM` in `scripts/wolf-chat-server.js`

### Change Model

Edit the `model` field in the Anthropic API call (default: claude-sonnet-4-20250514)

### Change Port

```powershell
$env:WOLF_PORT = "8080"
node scripts/wolf-chat-server.js
```

## Troubleshooting

**"wolf is sleeping" error**
- Check Netlify has WOLF_API_URL set
- Verify tunnel is running

**"Unauthorized" error**
- Make sure WOLF_API_TOKEN matches between Netlify and wolf server

**Slow responses**
- First request may be slow (cold start)
- Check Anthropic API status

**Chat not appearing**
- Check browser console for JS errors
- Verify wolf-chat.js is loaded
