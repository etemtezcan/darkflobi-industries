#!/usr/bin/env node
/**
 * Romulus API Server
 * Wolf spawning infrastructure for autonomous AI agents
 * 
 * Endpoints:
 *   GET  /status           - Pack status overview
 *   GET  /wolves           - List all wolves
 *   GET  /wolves/:id       - Get wolf details
 *   POST /wolves/spawn     - Spawn a new wolf
 *   GET  /bounties         - List open bounties
 *   POST /bounties         - Create a bounty
 *   POST /bounties/:id/claim - Claim a bounty
 *   POST /bounties/:id/submit - Submit completion
 *   GET  /leaderboard      - Wolf rankings
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3033;
const DATA_DIR = path.join(__dirname, 'data');
const WOLVES_FILE = path.join(DATA_DIR, 'wolves.json');
const BOUNTIES_FILE = path.join(DATA_DIR, 'bounties.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files
function initData() {
  if (!fs.existsSync(WOLVES_FILE)) {
    const initial = {
      pack: 'darkflobi',
      alpha: {
        id: 'wolf-01',
        name: 'darkflobi',
        wallet: 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD',
        role: 'alpha',
        spawned: '2026-01-31T00:00:00Z',
        status: 'active',
        tasksCompleted: 0,
        earnings: 0
      },
      wolves: [],
      stats: {
        totalWolves: 1,
        activeWolves: 1,
        totalBounties: 0,
        totalPaid: 0
      }
    };
    fs.writeFileSync(WOLVES_FILE, JSON.stringify(initial, null, 2));
  }
  
  if (!fs.existsSync(BOUNTIES_FILE)) {
    fs.writeFileSync(BOUNTIES_FILE, JSON.stringify({ bounties: [] }, null, 2));
  }
}

function loadWolves() {
  return JSON.parse(fs.readFileSync(WOLVES_FILE, 'utf8'));
}

function saveWolves(data) {
  fs.writeFileSync(WOLVES_FILE, JSON.stringify(data, null, 2));
}

function loadBounties() {
  return JSON.parse(fs.readFileSync(BOUNTIES_FILE, 'utf8'));
}

function saveBounties(data) {
  fs.writeFileSync(BOUNTIES_FILE, JSON.stringify(data, null, 2));
}

function generateWolfId() {
  const num = loadWolves().wolves.length + 2; // +2 because alpha is 01
  return `wolf-${String(num).padStart(2, '0')}`;
}

function generateBountyId() {
  return 'bounty-' + crypto.randomBytes(4).toString('hex');
}

// API handlers
const handlers = {
  'GET /status': () => {
    const wolves = loadWolves();
    const bounties = loadBounties();
    const openBounties = bounties.bounties.filter(b => b.status === 'open').length;
    
    return {
      pack: 'Romulus',
      alpha: 'darkflobi',
      version: '0.2.0',
      stats: {
        ...wolves.stats,
        openBounties,
        timestamp: new Date().toISOString()
      },
      api: {
        wolves: '/wolves',
        bounties: '/bounties',
        leaderboard: '/leaderboard'
      }
    };
  },
  
  'GET /wolves': () => {
    const data = loadWolves();
    return {
      alpha: data.alpha,
      wolves: data.wolves,
      total: data.stats.totalWolves
    };
  },
  
  'GET /wolves/:id': (params) => {
    const data = loadWolves();
    if (params.id === 'wolf-01' || params.id === 'darkflobi') {
      return data.alpha;
    }
    const wolf = data.wolves.find(w => w.id === params.id);
    if (!wolf) return { error: 'Wolf not found', status: 404 };
    return wolf;
  },
  
  'POST /wolves/spawn': (params, body) => {
    const data = loadWolves();
    const wolfId = generateWolfId();
    
    const newWolf = {
      id: wolfId,
      name: body.name || `Wolf ${wolfId}`,
      wallet: body.wallet || null, // Will be generated
      role: body.role || 'hunter',
      type: body.type || 'general',
      spawned: new Date().toISOString(),
      parent: 'darkflobi',
      status: 'active',
      tasksCompleted: 0,
      earnings: 0,
      metadata: body.metadata || {}
    };
    
    data.wolves.push(newWolf);
    data.stats.totalWolves++;
    data.stats.activeWolves++;
    saveWolves(data);
    
    return {
      success: true,
      wolf: newWolf,
      message: `Wolf ${wolfId} spawned successfully 🐺`
    };
  },
  
  'GET /bounties': () => {
    const data = loadBounties();
    return {
      bounties: data.bounties,
      open: data.bounties.filter(b => b.status === 'open').length,
      claimed: data.bounties.filter(b => b.status === 'claimed').length,
      completed: data.bounties.filter(b => b.status === 'completed').length
    };
  },
  
  'POST /bounties': (params, body) => {
    const data = loadBounties();
    const bountyId = generateBountyId();
    
    if (!body.title || !body.reward) {
      return { error: 'Missing required fields: title, reward', status: 400 };
    }
    
    const newBounty = {
      id: bountyId,
      title: body.title,
      description: body.description || '',
      reward: body.reward, // in SOL
      rewardToken: body.rewardToken || 'SOL',
      postedBy: body.postedBy || 'darkflobi',
      posted: new Date().toISOString(),
      deadline: body.deadline || null,
      requirements: body.requirements || [],
      status: 'open',
      claimedBy: null,
      claimedAt: null,
      completedAt: null,
      submission: null
    };
    
    data.bounties.push(newBounty);
    saveBounties(data);
    
    // Update wolf stats
    const wolves = loadWolves();
    wolves.stats.totalBounties++;
    saveWolves(wolves);
    
    return {
      success: true,
      bounty: newBounty,
      message: `Bounty ${bountyId} created 🎯`
    };
  },
  
  'POST /bounties/:id/claim': (params, body) => {
    const data = loadBounties();
    const bounty = data.bounties.find(b => b.id === params.id);
    
    if (!bounty) return { error: 'Bounty not found', status: 404 };
    if (bounty.status !== 'open') return { error: 'Bounty not available', status: 400 };
    if (!body.wolfId) return { error: 'Missing wolfId', status: 400 };
    
    bounty.status = 'claimed';
    bounty.claimedBy = body.wolfId;
    bounty.claimedAt = new Date().toISOString();
    saveBounties(data);
    
    return {
      success: true,
      bounty,
      message: `Bounty claimed by ${body.wolfId} 🐺`
    };
  },
  
  'POST /bounties/:id/submit': (params, body) => {
    const data = loadBounties();
    const bounty = data.bounties.find(b => b.id === params.id);
    
    if (!bounty) return { error: 'Bounty not found', status: 404 };
    if (bounty.status !== 'claimed') return { error: 'Bounty not claimed', status: 400 };
    if (!body.proof) return { error: 'Missing proof of completion', status: 400 };
    
    bounty.status = 'pending_review';
    bounty.submission = {
      proof: body.proof,
      notes: body.notes || '',
      submittedAt: new Date().toISOString()
    };
    saveBounties(data);
    
    return {
      success: true,
      bounty,
      message: 'Submission received, pending review 📝'
    };
  },
  
  'GET /leaderboard': () => {
    const data = loadWolves();
    const allWolves = [data.alpha, ...data.wolves];
    
    const leaderboard = allWolves
      .map(w => ({
        id: w.id,
        name: w.name,
        tasksCompleted: w.tasksCompleted,
        earnings: w.earnings,
        status: w.status
      }))
      .sort((a, b) => b.earnings - a.earnings);
    
    return {
      leaderboard,
      totalWolves: allWolves.length,
      totalEarnings: allWolves.reduce((sum, w) => sum + w.earnings, 0)
    };
  }
};

// Request handler
function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;
  const pathname = url.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Parse body for POST requests
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let parsedBody = {};
    try {
      if (body) parsedBody = JSON.parse(body);
    } catch (e) {}
    
    // Route matching
    let handler = null;
    let params = {};
    
    // Exact matches
    const exactKey = `${method} ${pathname}`;
    if (handlers[exactKey]) {
      handler = handlers[exactKey];
    }
    
    // Parameter matches
    if (!handler) {
      for (const [route, fn] of Object.entries(handlers)) {
        const [routeMethod, routePath] = route.split(' ');
        if (routeMethod !== method) continue;
        
        const routeParts = routePath.split('/');
        const pathParts = pathname.split('/');
        
        if (routeParts.length !== pathParts.length) continue;
        
        let match = true;
        for (let i = 0; i < routeParts.length; i++) {
          if (routeParts[i].startsWith(':')) {
            params[routeParts[i].slice(1)] = pathParts[i];
          } else if (routeParts[i] !== pathParts[i]) {
            match = false;
            break;
          }
        }
        
        if (match) {
          handler = fn;
          break;
        }
      }
    }
    
    if (!handler) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found', endpoints: Object.keys(handlers) }));
      return;
    }
    
    try {
      const result = handler(params, parsedBody);
      const status = result.status || 200;
      delete result.status;
      res.writeHead(status);
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

// Start server
initData();
const server = http.createServer(handleRequest);

server.on('error', (err) => {
  console.error('Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is in use. Try a different port.`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║  🐺 ROMULUS API SERVER                             ║
╠════════════════════════════════════════════════════╣
║  Pack:     darkflobi                               ║
║  Port:     ${String(PORT).padEnd(38)}║
║  Status:   ACTIVE                                  ║
╠════════════════════════════════════════════════════╣
║  Endpoints:                                        ║
║    GET  /status              Pack overview         ║
║    GET  /wolves              List wolves           ║
║    GET  /wolves/:id          Wolf details          ║
║    POST /wolves/spawn        Spawn new wolf        ║
║    GET  /bounties            List bounties         ║
║    POST /bounties            Create bounty         ║
║    POST /bounties/:id/claim  Claim bounty          ║
║    POST /bounties/:id/submit Submit completion     ║
║    GET  /leaderboard         Wolf rankings         ║
╚════════════════════════════════════════════════════╝
  `);
});
