#!/usr/bin/env node
/**
 * factory-deploy.js — deploy factory registry to website
 * 
 * Usage:
 *   node scripts/factory-deploy.js              # just update registry HTML
 *   node scripts/factory-deploy.js --deploy     # update + deploy to netlify
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'darkflobi-site');
const REGISTRY_PATH = path.join(SITE_DIR, 'factory-registry.json');

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function updateRegistryTimestamp() {
  const registry = loadRegistry();
  registry.updated = new Date().toISOString();
  
  // Recalculate stats
  registry.stats.totalSpawned = registry.agents.length;
  registry.stats.activeAgents = registry.agents.filter(a => a.status === 'running').length;
  registry.stats.tasksCompleted = registry.agents.filter(a => a.status === 'completed').length;
  
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  console.log('✓ Registry updated');
  return registry;
}

function deployToNetlify() {
  console.log('🚀 Deploying to Netlify...');
  try {
    const result = execSync(`netlify deploy --prod --dir="${SITE_DIR}"`, {
      encoding: 'utf8',
      cwd: SITE_DIR
    });
    console.log(result);
    console.log('✓ Deployed to darkflobi.com');
  } catch (e) {
    console.error('❌ Deploy failed:', e.message);
    process.exit(1);
  }
}

function printStatus() {
  const registry = loadRegistry();
  console.log('\n🏭 Factory Status');
  console.log('─'.repeat(40));
  console.log(`Total Agents:  ${registry.stats.totalSpawned}`);
  console.log(`Active:        ${registry.stats.activeAgents}`);
  console.log(`Completed:     ${registry.stats.tasksCompleted}`);
  console.log(`Last Updated:  ${registry.updated}`);
  console.log('─'.repeat(40));
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
🏭 factory-deploy.js — deploy factory registry

Usage:
  node factory-deploy.js              Update registry timestamp
  node factory-deploy.js --deploy     Update + deploy to Netlify
  node factory-deploy.js --status     Show factory status
`);
  process.exit(0);
}

if (args.includes('--status')) {
  printStatus();
} else {
  updateRegistryTimestamp();
  printStatus();
  
  if (args.includes('--deploy')) {
    deployToNetlify();
  }
}
