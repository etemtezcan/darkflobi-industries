#!/usr/bin/env node
/**
 * sync-wolf-pack.js - Generate wolf-pack.json from real data
 * 
 * Pulls from:
 * - factory-registry.json (spawned agents)
 * - sessions (active wolves via clawdbot)
 * - pipelines.json (hunt history)
 * 
 * Usage:
 *   node scripts/sync-wolf-pack.js           # Generate JSON only
 *   node scripts/sync-wolf-pack.js --deploy  # Generate + deploy to Netlify
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REGISTRY_PATH = path.join(__dirname, '..', 'darkflobi-site', 'factory-registry.json');
const PIPELINES_PATH = path.join(__dirname, '..', 'data', 'pipelines.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'darkflobi-site', 'romulus', 'wolf-pack.json');
const SITE_PATH = path.join(__dirname, '..', 'darkflobi-site');

// Wolf type metadata
const WOLF_TYPES = {
  scout: { emoji: '👁️', typeName: 'Scout Wolf', verb: 'patrolling' },
  research: { emoji: '🔬', typeName: 'Research Wolf', verb: 'analyzing' },
  builder: { emoji: '🔧', typeName: 'Builder Wolf', verb: 'building' },
  writer: { emoji: '✍️', typeName: 'Writer Wolf', verb: 'drafting' },
  monitor: { emoji: '📡', typeName: 'Monitor Wolf', verb: 'tracking' },
  default: { emoji: '🐺', typeName: 'Wolf', verb: 'hunting' }
};

function getWolfMeta(type) {
  return WOLF_TYPES[type] || WOLF_TYPES.default;
}

function determineStatus(agent) {
  if (agent.status === 'running' || agent.status === 'hunting') return { status: 'hunting', color: '#39ff14' };
  if (agent.status === 'prowling' || agent.status === 'pending') return { status: 'prowling', color: '#ffff00' };
  if (agent.status === 'completed' || agent.status === 'complete') return { status: 'completed', color: '#00ffff' };
  return { status: 'resting', color: '#666666' };
}

async function syncWolfPack() {
  console.log('🐺 Syncing wolf pack data...\n');
  
  const now = new Date();
  const wolves = [];
  let totalSpawned = 0;
  let totalCompleted = 0;
  let totalTokens = 0;
  let lastActivityTime = null;
  
  // 1. Load factory registry
  if (fs.existsSync(REGISTRY_PATH)) {
    try {
      const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
      console.log(`📋 Registry: ${registry.agents?.length || 0} agents`);
      
      if (registry.agents) {
        for (const agent of registry.agents) {
          totalSpawned++;
          const meta = getWolfMeta(agent.type);
          const statusInfo = determineStatus(agent);
          
          if (agent.status === 'completed' || agent.status === 'complete') {
            totalCompleted++;
          }
          
          // Track last activity
          const activityTime = agent.updated || agent.spawned;
          if (activityTime) {
            const t = new Date(activityTime);
            if (!lastActivityTime || t > lastActivityTime) {
              lastActivityTime = t;
            }
          }
          
          wolves.push({
            id: agent.id,
            label: agent.label || `${agent.type}-${agent.id.slice(0, 6)}`,
            type: agent.type,
            emoji: meta.emoji,
            typeName: meta.typeName,
            verb: meta.verb,
            status: statusInfo.status,
            statusColor: statusInfo.color,
            task: agent.task,
            spawnedAt: agent.spawned,
            updatedAt: agent.updated || agent.spawned,
            runtime: agent.runtime || null,
            tokens: agent.tokens || null
          });
        }
      }
      
      if (registry.stats) {
        totalSpawned = Math.max(totalSpawned, registry.stats.totalSpawned || 0);
        totalCompleted = Math.max(totalCompleted, registry.stats.tasksCompleted || 0);
      }
    } catch (e) {
      console.log('⚠️  Could not parse registry:', e.message);
    }
  } else {
    console.log('⚠️  No factory-registry.json found');
  }
  
  // 2. Load pipelines for additional wolf data
  if (fs.existsSync(PIPELINES_PATH)) {
    try {
      const pipelines = JSON.parse(fs.readFileSync(PIPELINES_PATH, 'utf8'));
      console.log(`📋 Pipelines: ${pipelines.pipelines?.length || 0} hunts`);
      
      if (pipelines.pipelines) {
        for (const pipeline of pipelines.pipelines) {
          // Count completed stages
          if (pipeline.stages) {
            for (const stage of pipeline.stages) {
              if (stage.status === 'complete') {
                // Don't double-count if already in registry
                const exists = wolves.find(w => w.id === stage.wolfId);
                if (!exists && stage.completed) {
                  const t = new Date(stage.completed);
                  if (!lastActivityTime || t > lastActivityTime) {
                    lastActivityTime = t;
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.log('⚠️  Could not parse pipelines:', e.message);
    }
  }
  
  // 3. Try to get active session data from clawdbot
  try {
    const sessionsOutput = execSync('clawdbot sessions list --json 2>/dev/null', { 
      encoding: 'utf8',
      timeout: 5000 
    });
    const sessions = JSON.parse(sessionsOutput);
    
    if (sessions && sessions.length > 0) {
      console.log(`📋 Active sessions: ${sessions.length}`);
      
      for (const session of sessions) {
        // Check if it's a wolf session (label contains 'wolf')
        if (session.label && session.label.toLowerCase().includes('wolf')) {
          const existingWolf = wolves.find(w => w.label === session.label || w.id === session.sessionKey);
          
          if (existingWolf) {
            // Update existing wolf with live data
            existingWolf.status = session.active ? 'hunting' : 'resting';
            existingWolf.statusColor = session.active ? '#39ff14' : '#666666';
            if (session.tokens) {
              existingWolf.tokens = session.tokens;
              totalTokens += session.tokens;
            }
            if (session.lastActivity) {
              existingWolf.updatedAt = session.lastActivity;
            }
          } else {
            // New wolf from session
            const wolfType = session.label.includes('scout') ? 'scout' :
                           session.label.includes('research') ? 'research' :
                           session.label.includes('builder') ? 'builder' :
                           session.label.includes('writer') ? 'writer' :
                           session.label.includes('monitor') ? 'monitor' : 'default';
            const meta = getWolfMeta(wolfType);
            
            wolves.push({
              id: session.sessionKey,
              label: session.label,
              type: wolfType,
              emoji: meta.emoji,
              typeName: meta.typeName,
              verb: meta.verb,
              status: session.active ? 'hunting' : 'resting',
              statusColor: session.active ? '#39ff14' : '#666666',
              task: session.task || null,
              spawnedAt: session.created,
              updatedAt: session.lastActivity || session.created,
              tokens: session.tokens || null
            });
            
            totalSpawned++;
            if (session.tokens) totalTokens += session.tokens;
          }
        }
      }
    }
  } catch (e) {
    // Sessions command not available or failed - that's ok
    console.log('ℹ️  Could not fetch live sessions (normal if no wolves active)');
  }
  
  // Calculate totals
  const activeWolves = wolves.filter(w => w.status === 'hunting' || w.status === 'prowling');
  
  // Calculate total tokens from wolves if not from sessions
  if (totalTokens === 0) {
    for (const wolf of wolves) {
      if (wolf.tokens) totalTokens += wolf.tokens;
    }
  }
  
  // Sort wolves: active first, then by last update
  wolves.sort((a, b) => {
    const statusOrder = { hunting: 0, prowling: 1, completed: 2, resting: 3 };
    const aOrder = statusOrder[a.status] ?? 4;
    const bOrder = statusOrder[b.status] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });
  
  // Build output
  const output = {
    timestamp: now.toISOString(),
    lastActivity: lastActivityTime ? lastActivityTime.toISOString() : null,
    alpha: {
      name: 'darkflobi',
      status: activeWolves.length > 0 ? 'hunting' : 'idle',
      statusColor: activeWolves.length > 0 ? '#39ff14' : '#ffff00'
    },
    wolves: wolves,
    stats: {
      total: totalSpawned,
      active: activeWolves.length,
      completed: totalCompleted,
      tokensTotal: totalTokens
    }
  };
  
  // Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\n✅ Written to ${OUTPUT_PATH}`);
  console.log(`   Wolves: ${wolves.length} (${activeWolves.length} active)`);
  console.log(`   Total spawned: ${totalSpawned}`);
  console.log(`   Completed: ${totalCompleted}`);
  console.log(`   Tokens: ${totalTokens > 0 ? (totalTokens / 1000).toFixed(1) + 'K' : '--'}`);
  
  // Deploy if requested
  if (process.argv.includes('--deploy')) {
    console.log('\n🚀 Deploying to Netlify...');
    try {
      const deployOutput = execSync(`netlify deploy --prod --dir="${SITE_PATH}"`, {
        encoding: 'utf8',
        cwd: SITE_PATH,
        timeout: 60000
      });
      console.log('✅ Deployed!');
      
      // Extract URL from output
      const urlMatch = deployOutput.match(/Website URL:\s+(https:\/\/[^\s]+)/);
      if (urlMatch) {
        console.log(`   ${urlMatch[1]}`);
      }
    } catch (e) {
      console.log('❌ Deploy failed:', e.message);
      process.exit(1);
    }
  }
  
  return output;
}

// Run
syncWolfPack().catch(e => {
  console.error('❌ Sync failed:', e);
  process.exit(1);
});
