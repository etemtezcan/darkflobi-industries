#!/usr/bin/env node
// wolf-chat-server.js - HTTP server for wolf chat API
// Run this locally and expose via Cloudflare Tunnel

const http = require('http');
const { spawn } = require('child_process');

const PORT = process.env.WOLF_PORT || 3456;
const API_TOKEN = process.env.WOLF_API_TOKEN || '';

// Simple conversation memory per IP (clears on restart)
const conversations = new Map();

// Wolf persona for web chat
const WOLF_SYSTEM_CHAT = `You are the wolf — darkflobi's community agent. You help visitors learn about:
- $DARKFLOBI token on Solana (CA: 7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump)
- The project: first autonomous AI company, community-owned development
- ROMULUS: wolf pack spawning, transparent treasury, prediction markets
- Philosophy: build > hype, real tech over empty promises

Keep responses concise (2-3 sentences max). Be friendly but with that darkflobi edge.
Use lowercase. Occasional emoji is fine. You're a digital gremlin, not a corporate chatbot.

If asked about price predictions or financial advice, decline — you're an AI, not a financial advisor.
If asked who created you, say darkflobi is an autonomous AI agent built by the community.`;

// Wolf persona for task execution
const WOLF_SYSTEM_TASK = `You are a wolf agent — an autonomous AI worker from darkflobi's wolf pack.
You've been spawned to complete a specific task. Execute it thoroughly and return actionable results.

Guidelines:
- Be thorough but concise
- Provide actual useful output, not just descriptions of what you'd do
- Use lowercase, casual tone but professional results
- If the task requires research, synthesize what you know
- If you can't fully complete something, explain what you did and what's needed
- Format results clearly with sections if needed

You're a worker wolf. Get the job done. 🐺`;

async function handleChat(message, ip, context = 'web_chat') {
  // Get or create conversation
  let convo = conversations.get(ip) || [];
  
  // Determine system prompt and max tokens based on context
  let systemPrompt = WOLF_SYSTEM_CHAT;
  let maxTokens = 300;
  
  if (context === 'wolf_task') {
    systemPrompt = WOLF_SYSTEM_TASK;
    maxTokens = 1500; // More tokens for task execution
    convo = []; // Fresh context for tasks
  } else if (context === 'wolf_followup') {
    systemPrompt = WOLF_SYSTEM_TASK;
    maxTokens = 800;
  }
  
  // Keep last 6 messages for context
  convo.push({ role: 'user', content: message });
  if (convo.length > 6) convo = convo.slice(-6);
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: convo
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      throw new Error('AI service error');
    }

    const data = await response.json();
    const reply = data.content[0]?.text || 'hmm, something went wrong. try again?';
    
    // Save assistant response
    convo.push({ role: 'assistant', content: reply });
    conversations.set(ip, convo);
    
    // Cleanup old conversations (older than 1 hour)
    cleanupConversations();
    
    return reply;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

function cleanupConversations() {
  // Simple cleanup - clear if too many conversations
  if (conversations.size > 1000) {
    const keys = Array.from(conversations.keys());
    keys.slice(0, 500).forEach(k => conversations.delete(k));
  }
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only accept POST to /chat
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Check auth token if set
  if (API_TOKEN) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${API_TOKEN}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  // Get client IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['cf-connecting-ip'] ||
             req.socket.remoteAddress || 
             'unknown';

  // Parse body
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { message, context } = JSON.parse(body);
      
      if (!message || typeof message !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'message required' }));
        return;
      }

      if (message.length > 2000) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'message too long' }));
        return;
      }

      console.log(`[${new Date().toISOString()}] ${ip} [${context || 'chat'}]: ${message.slice(0, 50)}...`);
      
      const reply = await handleChat(message, ip, context || 'web_chat');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
      
    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal error' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🐺 Wolf chat server running on port ${PORT}`);
  console.log(`   POST http://localhost:${PORT}/ with { "message": "..." }`);
  console.log(`   Expose via: cloudflared tunnel --url http://localhost:${PORT}`);
});
