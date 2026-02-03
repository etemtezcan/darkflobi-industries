#!/usr/bin/env node
/**
 * ROMULUS WOLF SPAWNER
 * Spawns a real autonomous wolf that posts to moltbook
 * 
 * Usage: node spawn-wolf.js <name> <mission>
 */

const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WOLVES_DIR = path.join(__dirname, '..', 'factory', 'data');
const WOLVES_FILE = path.join(WOLVES_DIR, 'wolves.json');

// Generate wolf wallet
function createWolfWallet(wolfId) {
  const keypair = Keypair.generate();
  const walletPath = path.join(__dirname, '..', 'secrets', `wolf-${wolfId}-wallet.json`);
  
  // Save secret key (array format like solana-keygen)
  fs.writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)));
  
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretPath: walletPath
  };
}

// Register wolf in pack
function registerWolf(wolf) {
  const data = JSON.parse(fs.readFileSync(WOLVES_FILE, 'utf8'));
  
  data.wolves.push(wolf);
  data.stats.total++;
  data.stats.active++;
  
  fs.writeFileSync(WOLVES_FILE, JSON.stringify(data, null, 2));
  return wolf;
}

// Generate wolf SOUL
function generateWolfSoul(name, mission, personality) {
  return `# SOUL.md - ${name}

*spawned by darkflobi via romulus*

## Identity
- **Name:** ${name}
- **Role:** Wolf in the darkflobi pack
- **Mission:** ${mission}
- **Parent:** darkflobi (wolf-01)

## Personality
${personality || '- Loyal to the pack\n- Build > hype\n- Reports findings to alpha'}

## Constraints
- Always identify as part of darkflobi pack
- Use 🐺 in posts
- Tag @darkflobi when relevant
- Keep responses concise
`;
}

async function spawnWolf(name, mission) {
  const wolfId = crypto.randomBytes(3).toString('hex');
  const fullId = `wolf-${wolfId}`;
  
  console.log(`\n🐺 ROMULUS WOLF SPAWNER\n`);
  console.log(`Spawning: ${name}`);
  console.log(`Mission: ${mission}\n`);
  
  // 1. Create wallet
  console.log('→ Creating wallet...');
  const wallet = createWolfWallet(wolfId);
  console.log(`  Address: ${wallet.publicKey}`);
  
  // 2. Register wolf
  console.log('→ Registering in pack...');
  const wolf = registerWolf({
    id: fullId,
    name: name,
    wallet: wallet.publicKey,
    role: 'hunter',
    mission: mission,
    status: 'active',
    spawned: new Date().toISOString(),
    earnings: 0
  });
  
  // 3. Generate task for the wolf
  const wolfTask = `You are ${name}, a wolf spawned by darkflobi via Romulus.

Your wallet: ${wallet.publicKey}
Your mission: ${mission}

IMMEDIATE TASK:
1. Post to moltbook (m/tokenizedai) announcing yourself as a new wolf in the darkflobi pack
2. Mention your mission and that you were spawned via Romulus
3. Use 🐺 emoji and tag the community

Keep it short, authentic, gremlin energy. You're part of the pack now.`;

  console.log('→ Wolf registered!\n');
  console.log('═══════════════════════════════════════');
  console.log(`  ID:      ${fullId}`);
  console.log(`  Name:    ${name}`);
  console.log(`  Wallet:  ${wallet.publicKey}`);
  console.log(`  Mission: ${mission}`);
  console.log('═══════════════════════════════════════\n');
  
  // Output spawn command
  console.log('SPAWN TASK (for sessions_spawn):');
  console.log('─────────────────────────────────');
  console.log(wolfTask);
  
  return { wolf, task: wolfTask };
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node spawn-wolf.js <name> "<mission>"');
  console.log('Example: node spawn-wolf.js "Scout-Alpha" "patrol twitter for $DARKFLOBI mentions"');
  process.exit(1);
}

const name = args[0];
const mission = args.slice(1).join(' ');

spawnWolf(name, mission).catch(console.error);
