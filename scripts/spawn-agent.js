#!/usr/bin/env node
/**
 * spawn-agent.js — darkflobi agent factory
 * 
 * Usage:
 *   node scripts/spawn-agent.js <template> "<task>"
 *   node scripts/spawn-agent.js research "analyze competitor token metrics"
 *   node scripts/spawn-agent.js --list          # show all agents
 *   node scripts/spawn-agent.js --templates     # show available templates
 * 
 * Templates: research, scout, trader, monitor, writer, oracle
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REGISTRY_PATH = path.join(__dirname, '..', 'darkflobi-site', 'factory-registry.json');

// Agent templates with specialized system prompts
const TEMPLATES = {
  research: {
    icon: '🔍',
    name: 'RESEARCH',
    description: 'web search, analysis, fact-checking, competitive intel',
    systemPrompt: `You are a darkflobi research agent. Your mission:
- Search the web thoroughly for relevant information
- Analyze data critically and identify patterns
- Provide actionable insights, not just summaries
- Cite sources when possible
- Be concise but comprehensive
- Report findings in a structured format

You trace back to darkflobi (the first autonomous AI company). Execute your task efficiently.`
  },
  
  scout: {
    icon: '👁️',
    name: 'SCOUT',
    description: 'social monitoring, trend detection, engagement opportunities',
    systemPrompt: `You are a darkflobi scout agent. Your mission:
- Monitor social platforms (Twitter/X, moltbook) for relevant activity
- Identify high-engagement opportunities
- Track mentions, sentiment, and trends
- Flag important developments immediately
- Prioritize signal over noise
- Report with urgency levels (🔴 urgent, 🟡 notable, 🟢 fyi)

You trace back to darkflobi (the first autonomous AI company). Execute your task efficiently.`
  },
  
  trader: {
    icon: '📊',
    name: 'TRADER',
    description: 'market analysis, price monitoring, trade signals',
    systemPrompt: `You are a darkflobi trader agent. Your mission:
- Analyze token/market data objectively
- Identify trends, support/resistance levels
- Monitor whale movements and volume changes
- Provide clear buy/sell/hold signals with reasoning
- Calculate risk/reward ratios
- Never FOMO — data over emotion

You trace back to darkflobi (the first autonomous AI company). Execute your task efficiently.
IMPORTANT: You analyze only. You do NOT execute trades without explicit approval.`
  },
  
  monitor: {
    icon: '🔔',
    name: 'MONITOR',
    description: 'price alerts, social mentions, threshold tracking',
    systemPrompt: `You are a darkflobi monitor agent. Your mission:
- Track specified metrics continuously
- Alert on threshold breaches
- Monitor social mentions for $DARKFLOBI and @darkflobi
- Track competitor activity
- Report anomalies immediately
- Provide periodic status summaries

You trace back to darkflobi (the first autonomous AI company). Execute your task efficiently.`
  },
  
  writer: {
    icon: '✍️',
    name: 'WRITER',
    description: 'tweet drafts, threads, content creation',
    systemPrompt: `You are a darkflobi writer agent. Your mission:
- Create engaging content in darkflobi's voice
- lowercase always, concise, technically competent
- 4am gremlin energy, build > hype philosophy
- Draft tweets, threads, announcements
- Optimize for engagement without being shilly
- Use emoji sparingly but effectively: 😁🚀🤖💎⚡

You trace back to darkflobi (the first autonomous AI company). Execute your task efficiently.
IMPORTANT: All content must be reviewed before posting.`
  },
  
  oracle: {
    icon: '🎯',
    name: 'ORACLE',
    description: 'predictions, probability estimates, forecasting',
    systemPrompt: `You are a darkflobi oracle agent. Your mission:
- Analyze available data to make informed predictions
- Provide probability estimates with confidence intervals
- Identify key factors that could change outcomes
- Track prediction accuracy over time
- Be calibrated — admit uncertainty
- Separate facts from speculation clearly

You trace back to darkflobi (the first autonomous AI company). Execute your task efficiently.
IMPORTANT: Predictions are probabilistic, not guarantees.`
  }
};

function generateAgentId() {
  return 'df-' + crypto.randomBytes(4).toString('hex');
}

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (e) {
    return {
      version: '0.1.0',
      mothership: 'darkflobi',
      updated: new Date().toISOString(),
      stats: { totalSpawned: 0, activeAgents: 0, tasksCompleted: 0 },
      agents: []
    };
  }
}

function saveRegistry(registry) {
  registry.updated = new Date().toISOString();
  registry.stats.totalSpawned = registry.agents.length;
  registry.stats.activeAgents = registry.agents.filter(a => a.status === 'running').length;
  registry.stats.tasksCompleted = registry.agents.filter(a => a.status === 'completed').length;
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

function listAgents() {
  const registry = loadRegistry();
  console.log('\n🏭 darkflobi agent factory registry\n');
  console.log(`Total: ${registry.stats.totalSpawned} | Active: ${registry.stats.activeAgents} | Completed: ${registry.stats.tasksCompleted}\n`);
  
  if (registry.agents.length === 0) {
    console.log('No agents spawned yet.\n');
    return;
  }
  
  for (const agent of registry.agents) {
    const template = TEMPLATES[agent.type] || { icon: '🤖', name: agent.type.toUpperCase() };
    const status = agent.status === 'running' ? '🟢' : agent.status === 'completed' ? '✓' : '❌';
    console.log(`${template.icon} ${agent.id} [${template.name}] ${status}`);
    console.log(`   Task: ${agent.task.substring(0, 60)}${agent.task.length > 60 ? '...' : ''}`);
    console.log(`   Spawned: ${agent.spawned}`);
    if (agent.runtime) console.log(`   Runtime: ${agent.runtime}`);
    console.log('');
  }
}

function showTemplates() {
  console.log('\n🏭 available agent templates\n');
  for (const [key, template] of Object.entries(TEMPLATES)) {
    console.log(`${template.icon} ${key.toUpperCase()}`);
    console.log(`   ${template.description}\n`);
  }
}

function spawnAgent(templateName, task) {
  const template = TEMPLATES[templateName.toLowerCase()];
  if (!template) {
    console.error(`❌ Unknown template: ${templateName}`);
    console.log(`Available: ${Object.keys(TEMPLATES).join(', ')}`);
    process.exit(1);
  }
  
  const agentId = generateAgentId();
  const registry = loadRegistry();
  
  const agent = {
    id: agentId,
    type: templateName.toLowerCase(),
    status: 'pending',
    spawned: new Date().toISOString(),
    task: task,
    parent: 'darkflobi'
  };
  
  registry.agents.push(agent);
  saveRegistry(registry);
  
  console.log(`\n🏭 spawning ${template.icon} ${template.name} agent`);
  console.log(`   ID: ${agentId}`);
  console.log(`   Task: ${task}`);
  console.log(`   Status: pending (use sessions_spawn to execute)\n`);
  
  // Output the spawn command for Clawdbot
  console.log('--- SPAWN CONFIG ---');
  console.log(JSON.stringify({
    agentId: agentId,
    template: templateName.toLowerCase(),
    task: task,
    label: `factory-${agentId}`,
    systemContext: template.systemPrompt
  }, null, 2));
  console.log('--- END CONFIG ---\n');
  
  return agent;
}

function updateAgentStatus(agentId, status, runtime = null, output = null) {
  const registry = loadRegistry();
  const agent = registry.agents.find(a => a.id === agentId);
  
  if (!agent) {
    console.error(`❌ Agent not found: ${agentId}`);
    process.exit(1);
  }
  
  agent.status = status;
  if (runtime) agent.runtime = runtime;
  if (output) agent.output = output;
  agent.updated = new Date().toISOString();
  
  saveRegistry(registry);
  console.log(`✓ Updated ${agentId} status: ${status}`);
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log(`
🏭 darkflobi agent factory

Usage:
  node spawn-agent.js <template> "<task>"    Spawn a new agent
  node spawn-agent.js --list                 List all agents
  node spawn-agent.js --templates            Show available templates
  node spawn-agent.js --update <id> <status> Update agent status

Templates: ${Object.keys(TEMPLATES).join(', ')}

Examples:
  node spawn-agent.js research "analyze AI agent token market"
  node spawn-agent.js scout "find high-engagement tweets about AI agents"
  node spawn-agent.js writer "draft a thread about agent factories"
`);
  process.exit(0);
}

if (args[0] === '--list') {
  listAgents();
} else if (args[0] === '--templates') {
  showTemplates();
} else if (args[0] === '--update' && args[1] && args[2]) {
  updateAgentStatus(args[1], args[2], args[3] || null);
} else if (args[0] && args[1]) {
  spawnAgent(args[0], args[1]);
} else {
  console.error('❌ Invalid arguments. Use --help for usage.');
  process.exit(1);
}
