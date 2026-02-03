/**
 * pump.fun alpha scanner via dexscreener
 * finds early movers with good signals
 */

const DEXSCREENER_API = 'https://api.dexscreener.com';

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

async function getLatestProfiles() {
  // Get latest token profiles (newest launches)
  const profiles = await fetchJSON(`${DEXSCREENER_API}/token-profiles/latest/v1`);
  // Filter to solana pump.fun tokens
  return profiles.filter(p => 
    p.chainId === 'solana' && 
    p.tokenAddress?.toLowerCase().includes('pump')
  );
}

async function getTokenData(addresses) {
  // Batch fetch token data (max 30 per request)
  const chunks = [];
  for (let i = 0; i < addresses.length; i += 30) {
    chunks.push(addresses.slice(i, i + 30));
  }
  
  const allPairs = [];
  for (const chunk of chunks) {
    const url = `${DEXSCREENER_API}/latest/dex/tokens/${chunk.join(',')}`;
    const data = await fetchJSON(url);
    if (data.pairs) allPairs.push(...data.pairs);
  }
  return allPairs;
}

function analyzeToken(pair) {
  const score = { total: 0, signals: [], flags: [] };
  
  // Market cap check - want micro caps for 0.1 SOL plays
  const mcap = pair.marketCap || pair.fdv || 0;
  if (mcap > 3000 && mcap < 20000) {
    score.total += 3;
    score.signals.push(`🟢 micro ($${(mcap/1000).toFixed(1)}k)`);
  } else if (mcap >= 20000 && mcap < 50000) {
    score.total += 2;
    score.signals.push(`🟡 low ($${(mcap/1000).toFixed(1)}k)`);
  } else if (mcap >= 50000 && mcap < 150000) {
    score.total += 1;
    score.signals.push(`⚪ mid ($${(mcap/1000).toFixed(1)}k)`);
  } else if (mcap < 3000 && mcap > 0) {
    score.flags.push(`⚠️ too small ($${mcap.toFixed(0)})`);
  }
  
  // Volume analysis
  const vol1h = pair.volume?.h1 || 0;
  if (vol1h > 20000) {
    score.total += 3;
    score.signals.push(`🟢 hot vol ($${(vol1h/1000).toFixed(0)}k/1h)`);
  } else if (vol1h > 5000) {
    score.total += 2;
    score.signals.push(`🟡 good vol ($${(vol1h/1000).toFixed(1)}k/1h)`);
  } else if (vol1h > 1000) {
    score.total += 1;
    score.signals.push(`⚪ some vol ($${(vol1h/1000).toFixed(1)}k/1h)`);
  }
  
  // Buy/sell ratio (momentum indicator)
  const buys1h = pair.txns?.h1?.buys || 0;
  const sells1h = pair.txns?.h1?.sells || 0;
  const totalTxns = buys1h + sells1h;
  
  if (totalTxns > 100) {
    const buyRatio = buys1h / Math.max(sells1h, 1);
    if (buyRatio > 1.8) {
      score.total += 3;
      score.signals.push(`🟢 heavy buys (${buys1h}/${sells1h})`);
    } else if (buyRatio > 1.3) {
      score.total += 2;
      score.signals.push(`🟡 buy pressure (${buys1h}/${sells1h})`);
    } else if (buyRatio < 0.6) {
      score.flags.push(`🔴 dump (${buys1h}/${sells1h})`);
      score.total -= 2;
    }
  }
  
  // Price momentum
  const change1h = pair.priceChange?.h1 || 0;
  const change5m = pair.priceChange?.m5 || 0;
  
  if (change1h > 100) {
    score.total += 2;
    score.signals.push(`🚀 +${change1h.toFixed(0)}% 1h`);
  } else if (change1h > 30) {
    score.total += 1;
    score.signals.push(`📈 +${change1h.toFixed(0)}% 1h`);
  } else if (change1h < -40) {
    score.flags.push(`📉 ${change1h.toFixed(0)}% 1h`);
    score.total -= 1;
  }
  
  // Recent momentum (5m) - is it still going?
  if (change5m > 10 && change1h > 0) {
    score.total += 1;
    score.signals.push(`⚡ still running`);
  } else if (change5m < -15 && change1h > 50) {
    score.flags.push(`⚠️ cooling off`);
  }
  
  // Age - newer is better for entries
  const createdAt = pair.pairCreatedAt;
  if (createdAt) {
    const ageHours = (Date.now() - createdAt) / 3600000;
    if (ageHours < 0.5) {
      score.total += 2;
      score.signals.push(`🆕 <30min`);
    } else if (ageHours < 2) {
      score.total += 1;
      score.signals.push(`🕐 <2h`);
    } else if (ageHours < 6) {
      score.signals.push(`⏰ ${ageHours.toFixed(1)}h`);
    }
  }
  
  // Has boosts (paid promo - double edged)
  if (pair.boosts?.active > 10) {
    score.signals.push(`💎 ${pair.boosts.active} boosts`);
  }
  
  return {
    name: pair.baseToken?.name || 'Unknown',
    symbol: pair.baseToken?.symbol || '???',
    ca: pair.baseToken?.address,
    mcap,
    vol1h,
    buys1h,
    sells1h,
    change1h,
    change5m,
    liquidity: pair.liquidity?.usd || 0,
    score: score.total,
    signals: score.signals,
    flags: score.flags,
    url: pair.url,
    pumpUrl: `https://pump.fun/${pair.baseToken?.address}`
  };
}

async function scan() {
  console.log('═'.repeat(60));
  console.log('🔍 ALPHA SCANNER - pump.fun');
  console.log(`   ${new Date().toLocaleString()}`);
  console.log('═'.repeat(60) + '\n');
  
  try {
    // Get latest profiles
    const profiles = await getLatestProfiles();
    console.log(`📡 Found ${profiles.length} recent pump.fun tokens\n`);
    
    if (profiles.length === 0) {
      console.log('No pump tokens in latest profiles');
      return [];
    }
    
    // Get full data for these tokens
    const addresses = profiles.map(p => p.tokenAddress);
    const pairs = await getTokenData(addresses);
    
    console.log(`📊 Got data for ${pairs.length} pairs\n`);
    
    // Filter to pump.fun dex only
    const pumpPairs = pairs.filter(p => p.dexId === 'pumpfun');
    
    // Analyze each
    const analyzed = pumpPairs.map(analyzeToken);
    const sorted = analyzed.sort((a, b) => b.score - a.score);
    
    // High conviction (score 5+)
    const plays = sorted.filter(t => t.score >= 5);
    
    if (plays.length > 0) {
      console.log('🎯 HIGH CONVICTION PLAYS:\n');
      plays.forEach(t => {
        console.log('─'.repeat(55));
        console.log(`🚀 ${t.name} ($${t.symbol})`);
        console.log(`   SCORE: ${t.score} ${t.score >= 8 ? '🔥🔥🔥' : t.score >= 6 ? '🔥🔥' : '🔥'}`);
        console.log(`   CA: ${t.ca}`);
        console.log(`   MCap: $${(t.mcap/1000).toFixed(1)}k | Liq: $${(t.liquidity/1000).toFixed(1)}k`);
        console.log(`   Vol 1h: $${(t.vol1h/1000).toFixed(1)}k | Txns: ${t.buys1h}/${t.sells1h}`);
        console.log(`   ✅ ${t.signals.join(' | ')}`);
        if (t.flags.length) console.log(`   ⚠️ ${t.flags.join(' | ')}`);
        console.log(`   🔗 ${t.pumpUrl}`);
        console.log('');
      });
    }
    
    // Watchlist (score 3-4)
    const watch = sorted.filter(t => t.score >= 3 && t.score < 5).slice(0, 5);
    if (watch.length > 0) {
      console.log('\n👀 WATCHLIST:\n');
      watch.forEach(t => {
        console.log(`  • ${t.symbol} (${t.score}pts) $${(t.mcap/1000).toFixed(1)}k - ${t.signals.slice(0,2).join(', ')}`);
      });
    }
    
    if (plays.length === 0) {
      console.log('⏳ No high-conviction plays right now\n');
      if (sorted.length > 0) {
        console.log('Top tokens:');
        sorted.slice(0, 5).forEach(t => {
          console.log(`  ${t.symbol} (${t.score}pts) $${(t.mcap/1000).toFixed(1)}k mcap`);
          if (t.signals.length) console.log(`    ${t.signals.slice(0,3).join(' | ')}`);
        });
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('💡 Strategy: 0.1 SOL on score 5+ | take profit at 2x');
    console.log('═'.repeat(60));
    
    return sorted;
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    return [];
  }
}

// Export for module use
export { scan, getLatestProfiles, getTokenData, analyzeToken };

// Run if called directly
scan();
