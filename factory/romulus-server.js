#!/usr/bin/env node
/**
 * Romulus API Server v2
 * Simple and reliable wolf pack management
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3033;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const WOLVES_FILE = path.join(DATA_DIR, 'wolves.json');
const BOUNTIES_FILE = path.join(DATA_DIR, 'bounties.json');

// Initialize
function init() {
  if (!fs.existsSync(WOLVES_FILE)) {
    fs.writeFileSync(WOLVES_FILE, JSON.stringify({
      alpha: {
        id: 'wolf-01', name: 'darkflobi',
        wallet: 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD',
        role: 'alpha', status: 'active', earnings: 0
      },
      wolves: [], stats: { total: 1, active: 1 }
    }, null, 2));
  }
  if (!fs.existsSync(BOUNTIES_FILE)) {
    fs.writeFileSync(BOUNTIES_FILE, JSON.stringify({ bounties: [] }, null, 2));
  }
}

function load(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// Handlers
function handleStatus() {
  const w = load(WOLVES_FILE);
  const b = load(BOUNTIES_FILE);
  return {
    pack: 'Romulus', alpha: 'darkflobi', version: '0.2.0',
    wolves: w.stats.total, bounties: b.bounties.length,
    openBounties: b.bounties.filter(x => x.status === 'open').length
  };
}

function handleWolves() {
  const w = load(WOLVES_FILE);
  return { alpha: w.alpha, wolves: w.wolves, total: w.stats.total };
}

function handleBounties() {
  const b = load(BOUNTIES_FILE);
  return { 
    bounties: b.bounties,
    open: b.bounties.filter(x => x.status === 'open').length
  };
}

function handleSpawn(body) {
  const w = load(WOLVES_FILE);
  const id = `wolf-${String(w.wolves.length + 2).padStart(2, '0')}`;
  const wolf = {
    id, name: body.name || id, role: body.role || 'hunter',
    status: 'active', spawned: new Date().toISOString(), earnings: 0
  };
  w.wolves.push(wolf);
  w.stats.total++;
  w.stats.active++;
  save(WOLVES_FILE, w);
  return { success: true, wolf };
}

function handleCreateBounty(body) {
  if (!body.title || !body.reward) return { error: 'Need title and reward' };
  const b = load(BOUNTIES_FILE);
  const bounty = {
    id: 'bounty-' + crypto.randomBytes(4).toString('hex'),
    title: body.title, description: body.description || '',
    reward: body.reward, status: 'open',
    posted: new Date().toISOString(), postedBy: body.postedBy || 'darkflobi'
  };
  b.bounties.push(bounty);
  save(BOUNTIES_FILE, b);
  return { success: true, bounty };
}

function handleLeaderboard() {
  const w = load(WOLVES_FILE);
  const all = [w.alpha, ...w.wolves];
  return { leaderboard: all.sort((a,b) => b.earnings - a.earnings) };
}

// Server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    let parsed = {};
    try { if (body) parsed = JSON.parse(body); } catch(e) {}
    
    const url = req.url.split('?')[0];
    let result;
    
    try {
      if (url === '/status' || url === '/') result = handleStatus();
      else if (url === '/wolves' && req.method === 'GET') result = handleWolves();
      else if (url === '/wolves/spawn' && req.method === 'POST') result = handleSpawn(parsed);
      else if (url === '/bounties' && req.method === 'GET') result = handleBounties();
      else if (url === '/bounties' && req.method === 'POST') result = handleCreateBounty(parsed);
      else if (url === '/leaderboard') result = handleLeaderboard();
      else result = { error: 'Not found', endpoints: ['/status', '/wolves', '/bounties', '/leaderboard'] };
    } catch(e) {
      result = { error: e.message };
    }
    
    res.writeHead(result.error && !result.endpoints ? 400 : 200);
    res.end(JSON.stringify(result, null, 2));
  });
});

init();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🐺 Romulus API running on port ${PORT}`);
  console.log(`   GET  /status     - Pack overview`);
  console.log(`   GET  /wolves     - List wolves`);
  console.log(`   POST /wolves/spawn - Spawn wolf`);
  console.log(`   GET  /bounties   - List bounties`);
  console.log(`   POST /bounties   - Create bounty`);
  console.log(`   GET  /leaderboard - Rankings`);
});
