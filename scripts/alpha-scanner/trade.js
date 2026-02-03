/**
 * Direct Solana trading script
 * Executes buys via Jupiter aggregator for best routing
 */

import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';

// Config
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const JUPITER_API = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const WALLET_PATH = '../../secrets/solana-wallet.json';

// Load wallet
function loadWallet() {
  try {
    const secretKey = JSON.parse(readFileSync(WALLET_PATH, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
  } catch (e) {
    console.error('❌ Failed to load wallet:', e.message);
    process.exit(1);
  }
}

// Get Jupiter quote
async function getQuote(inputMint, outputMint, amount, slippageBps = 1000) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
    onlyDirectRoutes: 'false',
    asLegacyTransaction: 'false'
  });
  
  const res = await fetch(`${JUPITER_API}/quote?${params}`);
  const data = await res.json();
  
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data;
}

// Get swap transaction
async function getSwapTx(quote, userPublicKey) {
  const res = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: userPublicKey.toString(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    })
  });
  
  const data = await res.json();
  
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data.swapTransaction;
}

// Execute buy
async function buy(tokenMint, solAmount) {
  console.log(`\n🎯 BUYING ${tokenMint}`);
  console.log(`   Amount: ${solAmount} SOL\n`);
  
  const wallet = loadWallet();
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Convert SOL to lamports
  const lamports = Math.floor(solAmount * 1e9);
  
  console.log('📡 Getting quote...');
  const quote = await getQuote(SOL_MINT, tokenMint, lamports);
  
  const outAmount = parseInt(quote.outAmount);
  const priceImpact = parseFloat(quote.priceImpactPct);
  
  console.log(`   Out: ${outAmount.toLocaleString()} tokens`);
  console.log(`   Price impact: ${(priceImpact * 100).toFixed(2)}%`);
  console.log(`   Route: ${quote.routePlan?.map(r => r.swapInfo?.label).join(' → ')}`);
  
  if (priceImpact > 0.15) {
    console.log('⚠️  High price impact! Proceed? (would need confirmation)');
  }
  
  console.log('\n📝 Building transaction...');
  const swapTxBase64 = await getSwapTx(quote, wallet.publicKey);
  
  // Deserialize and sign
  const swapTxBuf = Buffer.from(swapTxBase64, 'base64');
  const tx = VersionedTransaction.deserialize(swapTxBuf);
  tx.sign([wallet]);
  
  console.log('🚀 Sending transaction...');
  const signature = await connection.sendTransaction(tx, {
    skipPreflight: true,
    maxRetries: 3
  });
  
  console.log(`\n✅ TX SENT: ${signature}`);
  console.log(`   https://solscan.io/tx/${signature}`);
  
  // Wait for confirmation
  console.log('\n⏳ Waiting for confirmation...');
  const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  
  if (confirmation.value.err) {
    console.log('❌ Transaction failed:', confirmation.value.err);
    return { success: false, signature, error: confirmation.value.err };
  }
  
  console.log('✅ CONFIRMED!\n');
  return { success: true, signature, outAmount };
}

// Execute sell
async function sell(tokenMint, tokenAmount) {
  console.log(`\n💰 SELLING ${tokenMint}`);
  console.log(`   Amount: ${tokenAmount} tokens\n`);
  
  const wallet = loadWallet();
  const connection = new Connection(RPC_URL, 'confirmed');
  
  console.log('📡 Getting quote...');
  const quote = await getQuote(tokenMint, SOL_MINT, tokenAmount);
  
  const outAmount = parseInt(quote.outAmount) / 1e9;
  console.log(`   Out: ${outAmount.toFixed(4)} SOL`);
  
  console.log('\n📝 Building transaction...');
  const swapTxBase64 = await getSwapTx(quote, wallet.publicKey);
  
  const swapTxBuf = Buffer.from(swapTxBase64, 'base64');
  const tx = VersionedTransaction.deserialize(swapTxBuf);
  tx.sign([wallet]);
  
  console.log('🚀 Sending transaction...');
  const signature = await connection.sendTransaction(tx, {
    skipPreflight: true,
    maxRetries: 3
  });
  
  console.log(`\n✅ TX SENT: ${signature}`);
  console.log(`   https://solscan.io/tx/${signature}`);
  
  const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  
  if (confirmation.value.err) {
    console.log('❌ Transaction failed');
    return { success: false, signature };
  }
  
  console.log('✅ SOLD!\n');
  return { success: true, signature, solOut: outAmount };
}

// Check balance
async function checkBalance() {
  const wallet = loadWallet();
  const connection = new Connection(RPC_URL, 'confirmed');
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`\n💰 Wallet: ${wallet.publicKey.toString()}`);
  console.log(`   Balance: ${(balance / 1e9).toFixed(4)} SOL\n`);
  
  return balance / 1e9;
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === 'balance') {
  checkBalance();
} else if (command === 'buy' && args[1] && args[2]) {
  buy(args[1], parseFloat(args[2]));
} else if (command === 'sell' && args[1] && args[2]) {
  sell(args[1], args[2]);
} else {
  console.log(`
Usage:
  node trade.js balance              Check wallet balance
  node trade.js buy <CA> <SOL>       Buy token with SOL
  node trade.js sell <CA> <amount>   Sell tokens for SOL

Examples:
  node trade.js buy 5tkrntk4YrT1n39epzkSHygAvTqfi99TYvbhfej6pump 0.1
  node trade.js sell 5tkrntk4YrT1n39epzkSHygAvTqfi99TYvbhfej6pump 1000000
  `);
}

export { buy, sell, checkBalance };
