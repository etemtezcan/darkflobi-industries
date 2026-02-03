/**
 * Alpha Alert Bot
 * Scans pump.fun every 2 min, alerts on high-score tokens
 * Runs as background daemon
 */

import { scan, getLatestProfiles, getTokenData, analyzeToken } from './pump-monitor.js';

const SCAN_INTERVAL = 2 * 60 * 1000; // 2 minutes
const MIN_SCORE = 7; // Alert threshold
const SEEN_TOKENS = new Set(); // Don't alert same token twice

async function runScan() {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n[${timestamp}] Scanning...`);
  
  try {
    const profiles = await getLatestProfiles();
    if (!profiles.length) {
      console.log('  No tokens found');
      return;
    }
    
    const addresses = profiles.map(p => p.tokenAddress);
    const pairs = await getTokenData(addresses);
    const pumpPairs = pairs.filter(p => p.dexId === 'pumpfun');
    
    const analyzed = pumpPairs.map(analyzeToken);
    const hotPlays = analyzed.filter(t => t.score >= MIN_SCORE && !SEEN_TOKENS.has(t.ca));
    
    if (hotPlays.length > 0) {
      console.log(`\n🚨 ALERT: ${hotPlays.length} new high-score plays!\n`);
      
      for (const play of hotPlays) {
        SEEN_TOKENS.add(play.ca);
        
        // Format alert
        const alert = formatAlert(play);
        console.log(alert);
        console.log('─'.repeat(50));
        
        // Write to alert file for pickup
        await writeAlert(play);
      }
    } else {
      console.log(`  Checked ${analyzed.length} tokens, no new plays above score ${MIN_SCORE}`);
    }
    
  } catch (e) {
    console.error('  Scan error:', e.message);
  }
}

function formatAlert(play) {
  return `
🎯 ${play.name} ($${play.symbol})
   Score: ${play.score} ${'🔥'.repeat(Math.min(play.score - 4, 5))}
   MCap: $${(play.mcap/1000).toFixed(1)}k
   Vol 1h: $${(play.vol1h/1000).toFixed(1)}k  
   Buy/Sell: ${play.buys1h}/${play.sells1h}
   ${play.change1h > 0 ? '📈' : '📉'} ${play.change1h.toFixed(0)}% 1h
   
   CA: ${play.ca}
   🔗 pump.fun/${play.ca}
   
   Signals: ${play.signals.join(' | ')}
   ${play.flags.length ? '⚠️ ' + play.flags.join(' | ') : ''}
`;
}

async function writeAlert(play) {
  const fs = await import('fs');
  const alertFile = 'alerts.jsonl';
  
  const alert = {
    timestamp: Date.now(),
    symbol: play.symbol,
    name: play.name,
    ca: play.ca,
    score: play.score,
    mcap: play.mcap,
    vol1h: play.vol1h,
    change1h: play.change1h,
    signals: play.signals
  };
  
  fs.appendFileSync(alertFile, JSON.stringify(alert) + '\n');
}

// Main loop
console.log('═'.repeat(50));
console.log('🤖 ALPHA ALERT BOT');
console.log(`   Scanning every ${SCAN_INTERVAL/1000}s`);
console.log(`   Alert threshold: score ${MIN_SCORE}+`);
console.log('═'.repeat(50));

// Initial scan
runScan();

// Schedule recurring scans
setInterval(runScan, SCAN_INTERVAL);

console.log('\nBot running. Ctrl+C to stop.\n');
