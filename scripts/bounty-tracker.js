const { Connection, Keypair, PublicKey, VersionedTransaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const WALLET_PATH = path.join(__dirname, '..', 'secrets', 'solana-wallet.json');
const BOUNTY_LOG = path.join(__dirname, '..', 'data', 'bounty-claims.json');
const DARKFLOBI_MINT = '7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump';

// Bounty tiers (SOL amount -> DARKFLOBI bonus)
const BOUNTY_TIERS = {
  0.1: 50000,
  0.25: 150000,
  0.5: 400000,
  1.0: 1000000
};

// Load or create bounty log
function loadBountyLog() {
  try {
    return JSON.parse(fs.readFileSync(BOUNTY_LOG));
  } catch {
    return { claims: [], totalPaid: 0 };
  }
}

function saveBountyLog(log) {
  fs.mkdirSync(path.dirname(BOUNTY_LOG), { recursive: true });
  fs.writeFileSync(BOUNTY_LOG, JSON.stringify(log, null, 2));
}

// Verify a purchase transaction
async function verifyPurchaseTx(txSignature) {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const tx = await connection.getParsedTransaction(txSignature, {
    maxSupportedTransactionVersion: 0
  });
  
  if (!tx) return { valid: false, error: 'Transaction not found' };
  if (tx.meta?.err) return { valid: false, error: 'Transaction failed' };
  
  // Look for swap to DARKFLOBI
  let solSpent = 0;
  let darkflobiReceived = 0;
  let buyerWallet = null;
  
  // Check inner instructions for swap details
  const innerIxs = tx.meta?.innerInstructions || [];
  for (const inner of innerIxs) {
    for (const ix of inner.instructions) {
      if (ix.parsed?.type === 'transfer' && ix.parsed?.info?.mint === DARKFLOBI_MINT) {
        darkflobiReceived = parseInt(ix.parsed.info.amount) / 1e6;
        buyerWallet = ix.parsed.info.destination;
      }
    }
  }
  
  // Check main instructions
  for (const ix of tx.transaction.message.instructions) {
    if (ix.parsed?.type === 'transfer' && ix.program === 'system') {
      solSpent = parseInt(ix.parsed.info.lamports) / 1e9;
      buyerWallet = ix.parsed.info.source;
    }
  }
  
  // Determine bonus tier
  let bonus = 0;
  for (const [threshold, amount] of Object.entries(BOUNTY_TIERS).sort((a, b) => b[0] - a[0])) {
    if (solSpent >= parseFloat(threshold)) {
      bonus = amount;
      break;
    }
  }
  
  return {
    valid: solSpent >= 0.1,
    txSignature,
    buyerWallet,
    solSpent,
    darkflobiReceived,
    bonus,
    timestamp: tx.blockTime
  };
}

// Check if already claimed
function alreadyClaimed(log, txSignature) {
  return log.claims.some(c => c.txSignature === txSignature);
}

// Main function to process a claim
async function processClaim(txSignature, agentName) {
  console.log(`\nProcessing bounty claim from ${agentName}...`);
  console.log(`TX: ${txSignature}`);
  
  const log = loadBountyLog();
  
  // Check if already claimed
  if (alreadyClaimed(log, txSignature)) {
    console.log('❌ Already claimed!');
    return { success: false, error: 'Already claimed' };
  }
  
  // Verify the transaction
  const verification = await verifyPurchaseTx(txSignature);
  
  if (!verification.valid) {
    console.log(`❌ Invalid: ${verification.error}`);
    return { success: false, error: verification.error };
  }
  
  if (verification.bonus === 0) {
    console.log(`❌ Purchase too small (${verification.solSpent} SOL, minimum 0.1 SOL)`);
    return { success: false, error: 'Below minimum' };
  }
  
  console.log(`✅ Verified: ${verification.solSpent} SOL spent`);
  console.log(`🎁 Bonus earned: ${verification.bonus.toLocaleString()} $DARKFLOBI`);
  
  // Record the claim
  const claim = {
    agentName,
    txSignature,
    buyerWallet: verification.buyerWallet,
    solSpent: verification.solSpent,
    bonus: verification.bonus,
    claimedAt: new Date().toISOString(),
    bonusPaid: false,
    bonusTx: null
  };
  
  log.claims.push(claim);
  saveBountyLog(log);
  
  console.log(`📝 Claim recorded. Bonus payment pending.`);
  
  return { success: true, claim };
}

// List all claims
function listClaims() {
  const log = loadBountyLog();
  console.log('\n=== BOUNTY CLAIMS ===\n');
  
  if (log.claims.length === 0) {
    console.log('No claims yet.');
    return;
  }
  
  for (const claim of log.claims) {
    const status = claim.bonusPaid ? '✅ PAID' : '⏳ PENDING';
    console.log(`${claim.agentName}: ${claim.solSpent} SOL → ${claim.bonus.toLocaleString()} bonus [${status}]`);
  }
  
  console.log(`\nTotal claims: ${log.claims.length}`);
  console.log(`Total paid: ${log.totalPaid.toLocaleString()} $DARKFLOBI`);
}

// CLI
const args = process.argv.slice(2);
if (args[0] === 'verify') {
  processClaim(args[1], args[2] || 'unknown').catch(console.error);
} else if (args[0] === 'list') {
  listClaims();
} else {
  console.log('Usage:');
  console.log('  node bounty-tracker.js verify <tx_signature> <agent_name>');
  console.log('  node bounty-tracker.js list');
}
