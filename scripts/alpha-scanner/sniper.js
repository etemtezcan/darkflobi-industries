/**
 * Sniper - Scan + Instant Buy
 * One command to find and ape
 */

import { getLatestProfiles, getTokenData, analyzeToken } from './pump-monitor.js';
import { buy, checkBalance } from './trade.js';

const MIN_SCORE = 6;
const MAX_MCAP = 50000; // Only micro caps
const BUY_AMOUNT = 0.1; // SOL per trade

async function snipe(autoExecute = false) {
  console.log('═'.repeat(55));
  console.log('🎯 SNIPER MODE');
  console.log(`   Min Score: ${MIN_SCORE} | Max MCap: $${MAX_MCAP/1000}k`);
  console.log(`   Buy Amount: ${BUY_AMOUNT} SOL`);
  console.log('═'.repeat(55) + '\n');
  
  // Check balance first
  const balance = await checkBalance();
  if (balance < BUY_AMOUNT) {
    console.log(`❌ Insufficient balance. Need ${BUY_AMOUNT} SOL, have ${balance.toFixed(4)}`);
    return;
  }
  
  // Scan for targets
  console.log('🔍 Scanning for targets...\n');
  
  const profiles = await getLatestProfiles();
  const addresses = profiles.map(p => p.tokenAddress);
  const pairs = await getTokenData(addresses);
  const pumpPairs = pairs.filter(p => p.dexId === 'pumpfun');
  
  const analyzed = pumpPairs.map(analyzeToken);
  const targets = analyzed
    .filter(t => t.score >= MIN_SCORE && t.mcap < MAX_MCAP && t.mcap > 2000)
    .sort((a, b) => b.score - a.score);
  
  if (targets.length === 0) {
    console.log('❌ No targets found matching criteria');
    return;
  }
  
  console.log(`Found ${targets.length} targets:\n`);
  
  targets.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. ${t.symbol} (Score: ${t.score})`);
    console.log(`   MCap: $${(t.mcap/1000).toFixed(1)}k | Vol: $${(t.vol1h/1000).toFixed(1)}k/h`);
    console.log(`   ${t.signals.slice(0, 3).join(' | ')}`);
    console.log(`   CA: ${t.ca}\n`);
  });
  
  const best = targets[0];
  
  if (autoExecute) {
    console.log('─'.repeat(55));
    console.log(`\n🚀 AUTO-EXECUTING: ${best.symbol}`);
    console.log(`   Score: ${best.score} | MCap: $${(best.mcap/1000).toFixed(1)}k`);
    console.log(`   Buying ${BUY_AMOUNT} SOL worth...\n`);
    
    const result = await buy(best.ca, BUY_AMOUNT);
    
    if (result.success) {
      console.log('═'.repeat(55));
      console.log('✅ POSITION OPENED');
      console.log(`   Token: ${best.symbol}`);
      console.log(`   Entry MCap: $${(best.mcap/1000).toFixed(1)}k`);
      console.log(`   TX: ${result.signature}`);
      console.log('═'.repeat(55));
      
      // Log position
      const fs = await import('fs');
      const position = {
        timestamp: Date.now(),
        symbol: best.symbol,
        ca: best.ca,
        entryMcap: best.mcap,
        solIn: BUY_AMOUNT,
        tokensOut: result.outAmount,
        tx: result.signature
      };
      fs.appendFileSync('positions.jsonl', JSON.stringify(position) + '\n');
    }
    
    return result;
  } else {
    console.log('─'.repeat(55));
    console.log('\n💡 Top pick ready for execution:');
    console.log(`   node sniper.js --execute`);
    console.log(`   or: node trade.js buy ${best.ca} ${BUY_AMOUNT}`);
  }
}

// CLI
const args = process.argv.slice(2);
const autoExec = args.includes('--execute') || args.includes('-x');

snipe(autoExec);
