// wolf-chat.js - Netlify Function to proxy chat to wolf agent
// Requires WOLF_API_URL env var pointing to Cloudflare Tunnel

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 20; // 20 messages per hour per IP

// Simple in-memory rate limiting (resets on cold start, but good enough)
const rateLimits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimits.get(ip);
  
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimits.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  
  if (record.count >= MAX_REQUESTS) {
    return true;
  }
  
  record.count++;
  return false;
}

export default async function handler(req, context) {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Get client IP for rate limiting
  const ip = context.ip || req.headers.get('x-forwarded-for') || 'unknown';
  
  if (isRateLimited(ip)) {
    return Response.json({ 
      error: 'slow down! max 20 messages per hour. try again later.' 
    }, { status: 429 });
  }

  const wolfApiUrl = process.env.WOLF_API_URL;
  if (!wolfApiUrl) {
    console.error('WOLF_API_URL not configured');
    return Response.json({ 
      error: 'wolf is sleeping. try again later.' 
    }, { status: 503 });
  }

  try {
    const { message } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'message required' }, { status: 400 });
    }

    if (message.length > 1000) {
      return Response.json({ error: 'message too long (max 1000 chars)' }, { status: 400 });
    }

    // Call wolf API
    const response = await fetch(wolfApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WOLF_API_TOKEN || ''}`
      },
      body: JSON.stringify({
        message: message,
        context: 'web_chat'
      })
    });

    if (!response.ok) {
      console.error('Wolf API error:', response.status);
      return Response.json({ 
        error: 'wolf encountered an error. try again.' 
      }, { status: 502 });
    }

    const data = await response.json();
    
    return Response.json({ 
      reply: data.reply || data.message || 'no response'
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Wolf chat error:', error);
    return Response.json({ 
      error: 'something went wrong. try again.' 
    }, { status: 500 });
  }
}

export const config = {
  path: '/api/wolf-chat'
};
