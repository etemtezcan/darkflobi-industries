#!/usr/bin/env node
/**
 * darkflobi agent factory — spawn sub-agents
 * 
 * usage: node spawn-agent.js <type> "<task>"
 * types: research, scout, trader
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REGISTRY_PATH = path.join(__dirname, 'registry.json');
const TEMPLATES_PATH = path.join(__dirname, 'templates');
const AGENTS_PATH = path.join(__dirname, 'agents');

function generateAgentId() {
  return 'df-' + crypto.randomBytes(4).toString('hex');
}

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

function loadTemplate(type) {
  const templatePath = path.join(TEMPLATES_PATH, `${type}.md`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return fs.readFileSync(templatePath, 'utf8');
}

function spawnAgent(type, task) {
  const agentId = generateAgentId();
  const template = loadTemplate(type);
  const timestamp = new Date().toISOString();
  
  // Create agent record
  const agent = {
    id: agentId,
    type: type,
    parent: 'darkflobi',
    spawned: timestamp,
    task: task,
    status: 'pending',
    template: template
  };
  
  // Save agent record
  const agentPath = path.join(AGENTS_PATH, `${agentId}.json`);
  fs.writeFileSync(agentPath, JSON.stringify(agent, null, 2));
  
  // Update registry
  const registry = loadRegistry();
  registry.agents.push({
    id: agentId,
    type: type,
    spawned: timestamp,
    task: task.substring(0, 100) + (task.length > 100 ? '...' : ''),
    status: 'active'
  });
  registry.stats.totalSpawned++;
  registry.stats.activeAgents++;
  saveRegistry(registry);
  
  console.log(`
╔════════════════════════════════════════╗
║  DARKFLOBI AGENT FACTORY               ║
╠════════════════════════════════════════╣
║  Agent spawned successfully            ║
╠════════════════════════════════════════╣
║  ID:     ${agentId.padEnd(28)}║
║  Type:   ${type.padEnd(28)}║
║  Parent: darkflobi                     ║
║  Status: active                        ║
╚════════════════════════════════════════╝
`);
  
  return agent;
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('usage: node spawn-agent.js <type> "<task>"');
  console.log('types: research, scout, trader');
  process.exit(1);
}

const [type, ...taskParts] = args;
const task = taskParts.join(' ');

try {
  const agent = spawnAgent(type, task);
  
  // Output for piping to clawdbot
  console.log('\n--- SPAWN COMMAND ---');
  console.log(`Agent ${agent.id} ready. Use sessions_spawn with this context.`);
  
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
