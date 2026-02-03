#!/usr/bin/env node
/**
 * WOLF PORTFOLIO TRACKER
 * Shows holdings, P&L, and trade history for wolf wallets
 */

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

const RPC = 'https://api.mainnet-beta.solana.com';
const TRADES_FILE = path.join(__dirname, '..', 'data', 'wolf-trades.json');

// Initialize trades file
if (!fs.existsSync(TRADES_FILE)) {
  fs.writeFileSync(TRADES_FILE, JSON.stringify({ trades: [] }, null, 2));
}

// Get SOL balance
async function getSolBalance(address) {
  const connection = new Connection(RPC, 'confirmed');
  const pubkey = new PublicKey(address);
  const balance = await connection.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

// Get token holdings
async function getTokenHoldings(address) {
  const connection = new Connection(RPC, 'confirmed');
  const pubkey = new PublicKey(address);
  
  const accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: TOKEN_PROGRAM_ID
  });
  
  const holdings = [];
  for (const acc of accounts.value) {
    const info = acc.account.data.parsed.info;
    if (parseFloat(info.tokenAmount.uiAmount) > 0) {
      holdings.push({
        mint: info.mint,
        balance: info.tokenAmount.uiAmount,
        decimals: info.tokenAmount.decimals
      });
    }
  }
  return holdings;
}

// Log a trade
function logTrade(trade) {
  const data = JSON.parse(fs.readFileSync(TRADES_FILE, 'utf8'));
  data.trades.push({
    ...trade,
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(TRADES_FILE, JSON.stringify(data, null, 2));
}

// Get trade history
function getTradeHistory() {
  const data = JSON.parse(fs.readFileSync(TRADES_FILE, 'utf8'));
  return data.trades;
}

// Format portfolio display
async function showPortfolio(walletAddress, walletName = 'Wolf') {
  console.log(`\n🐺 ${walletName} PORTFOLIO`);
  console.log('═'.repeat(50));
  console.log(`Wallet: ${walletAddress}\n`);
  
  // SOL balance
  const solBalance = await getSolBalance(walletAddress);
  console.log(`SOL Balance: ${solBalance.toFixed(4)} SOL`);
  
  // Token holdings
  const holdings = await getTokenHoldings(walletAddress);
  if (holdings.length > 0) {
    console.log(`\nToken Holdings:`);
    for (const h of holdings) {
      console.log(`  ${h.mint.slice(0,8)}...: ${h.balance.toLocaleString()}`);
    }
  } else {
    console.log(`\nNo token holdings.`);
  }
  
  // Trade history
  const trades = getTradeHistory().filter(t => t.wallet === walletAddress);
  if (trades.length > 0) {
    console.log(`\nRecent Trades:`);
    for (const t of trades.slice(-5)) {
      const time = new Date(t.timestamp).toLocaleString();
      console.log(`  ${t.action} ${t.amount} ${t.token} @ ${time}`);
      if (t.txSignature) {
        console.log(`    TX: ${t.txSignature.slice(0,20)}...`);
      }
    }
  }
  
  console.log('═'.repeat(50));
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  
  // Default wallets
  const WALLETS = {
    'degen': '9x3WXjVd71tNmnk9wKJPSotPdmcncwCNzBHizL4fE55Q',
    'main': 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD'
  };
  
  if (cmd === 'show' || !cmd) {
    const wallet = args[1] || 'degen';
    const address = WALLETS[wallet] || wallet;
    await showPortfolio(address, wallet);
    
  } else if (cmd === 'log') {
    const [, action, token, amount, wallet, txSig] = args;
    if (!action || !token || !amount) {
      console.log('Usage: node wolf-portfolio.js log <buy|sell> <token> <amount> [wallet] [txSignature]');
      return;
    }
    logTrade({
      action,
      token,
      amount: parseFloat(amount),
      wallet: WALLETS[wallet] || wallet || WALLETS.degen,
      txSignature: txSig
    });
    console.log('Trade logged ✓');
    
  } else if (cmd === 'history') {
    const trades = getTradeHistory();
    console.log('\n📊 TRADE HISTORY');
    console.log('═'.repeat(50));
    for (const t of trades) {
      console.log(`${t.timestamp} | ${t.action} ${t.amount} ${t.token}`);
    }
    
  } else {
    console.log(`
🐺 WOLF PORTFOLIO TRACKER

Commands:
  show [wallet]              Show portfolio (default: degen)
  log <action> <token> <amt> Log a trade
  history                    Show all trades

Wallets:
  degen  - ${WALLETS.degen}
  main   - ${WALLETS.main}
    `);
  }
}

main().catch(console.error);
