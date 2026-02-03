/**
 * DEGEN TRADER - Quick pump.fun trading script
 * Uses Jupiter for swaps, monitors pump.fun for opportunities
 */

const { Connection, Keypair, PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const fetch = require('node-fetch');

// Config
const RPC = 'https://api.mainnet-beta.solana.com';
const JUPITER_QUOTE = 'https://api.jup.ag/swap/v1/quote';
const JUPITER_SWAP = 'https://api.jup.ag/swap/v1/swap';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Load degen wallet
const loadWallet = () => {
  const secret = JSON.parse(fs.readFileSync('secrets/degen-wallet.json'));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
};

// Get wallet balance
const getBalance = async (connection, pubkey) => {
  const balance = await connection.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
};

// Load Jupiter API key
const getApiKey = () => {
  try {
    return fs.readFileSync('secrets/jupiter-api-key.txt', 'utf8').trim();
  } catch {
    return null;
  }
};

// Get Jupiter Metis quote
const getQuote = async (inputMint, outputMint, amount, slippageBps = 500) => {
  const url = `${JUPITER_QUOTE}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
  const apiKey = getApiKey();
  const headers = apiKey ? { 'x-api-key': apiKey } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Quote failed: ${res.status} - ${err}`);
  }
  return res.json();
};

// Execute Jupiter Metis swap
const executeSwap = async (wallet, quoteResponse) => {
  const connection = new Connection(RPC, 'confirmed');
  const apiKey = getApiKey();
  
  // Get swap transaction
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;
  
  const swapRes = await fetch(JUPITER_SWAP, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: wallet.publicKey.toString(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    })
  });
  
  if (!swapRes.ok) {
    const err = await swapRes.text();
    throw new Error(`Swap request failed: ${err}`);
  }
  
  const { swapTransaction } = await swapRes.json();
  
  // Deserialize and sign
  const txBuf = Buffer.from(swapTransaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([wallet]);
  
  // Send with retries
  const sig = await connection.sendTransaction(tx, {
    skipPreflight: true,
    maxRetries: 3
  });
  
  // Confirm
  const confirmation = await connection.confirmTransaction(sig, 'confirmed');
  if (confirmation.value.err) {
    throw new Error(`TX failed: ${JSON.stringify(confirmation.value.err)}`);
  }
  
  return sig;
};

// BUY token with SOL
const buy = async (tokenMint, solAmount) => {
  const wallet = loadWallet();
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
  
  console.log(`\n🎰 BUYING ${solAmount} SOL worth of ${tokenMint.slice(0,8)}...`);
  console.log(`Wallet: ${wallet.publicKey.toString()}`);
  
  const quote = await getQuote(SOL_MINT, tokenMint, lamports);
  console.log(`Quote: ${quote.outAmount} tokens (${quote.priceImpactPct || 'N/A'}% impact)`);
  
  const sig = await executeSwap(wallet, quote);
  console.log(`✅ BUY SUCCESS: ${sig}`);
  console.log(`https://solscan.io/tx/${sig}`);
  
  return { sig, tokensReceived: quote.outAmount };
};

// SELL token for SOL
const sell = async (tokenMint, tokenAmount) => {
  const wallet = loadWallet();
  
  console.log(`\n💰 SELLING ${tokenAmount} of ${tokenMint.slice(0,8)}...`);
  console.log(`Wallet: ${wallet.publicKey.toString()}`);
  
  const quote = await getQuote(tokenMint, SOL_MINT, tokenAmount);
  console.log(`Quote: ${quote.outAmount / LAMPORTS_PER_SOL} SOL (${quote.priceImpactPct || 'N/A'}% impact)`);
  
  const sig = await executeSwap(wallet, quote);
  console.log(`✅ SELL SUCCESS: ${sig}`);
  console.log(`https://solscan.io/tx/${sig}`);
  
  return { sig, solReceived: quote.outAmount / LAMPORTS_PER_SOL };
};

// Get token balance
const getTokenBalance = async (tokenMint) => {
  const wallet = loadWallet();
  const connection = new Connection(RPC, 'confirmed');
  const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
  
  const accounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
    programId: TOKEN_PROGRAM_ID
  });
  
  for (const acc of accounts.value) {
    if (acc.account.data.parsed.info.mint === tokenMint) {
      return acc.account.data.parsed.info.tokenAmount;
    }
  }
  return { amount: '0', decimals: 9, uiAmount: 0 };
};

// Fetch pump.fun trending
const getPumpTrending = async () => {
  // Pump.fun doesn't have a public API, but we can scrape or use their frontend data
  // For now, return placeholder - would need to implement proper scraping
  console.log('Fetching pump.fun data...');
  return [];
};

// Main CLI
const main = async () => {
  const args = process.argv.slice(2);
  const cmd = args[0];
  
  const connection = new Connection(RPC, 'confirmed');
  const wallet = loadWallet();
  
  if (cmd === 'balance') {
    const bal = await getBalance(connection, wallet.publicKey);
    console.log(`\n🎰 Degen Wallet: ${wallet.publicKey.toString()}`);
    console.log(`💰 Balance: ${bal.toFixed(4)} SOL`);
    
  } else if (cmd === 'buy') {
    const token = args[1];
    const amount = parseFloat(args[2]) || 0.05;
    if (!token) {
      console.log('Usage: node degen-trader.js buy <TOKEN_MINT> [SOL_AMOUNT]');
      return;
    }
    await buy(token, amount);
    
  } else if (cmd === 'sell') {
    const token = args[1];
    const amount = args[2];
    if (!token) {
      console.log('Usage: node degen-trader.js sell <TOKEN_MINT> [AMOUNT or "all"]');
      return;
    }
    
    let tokenAmount = amount;
    if (!amount || amount === 'all') {
      const bal = await getTokenBalance(token);
      tokenAmount = bal.amount;
      console.log(`Selling all: ${bal.uiAmount} tokens`);
    }
    
    await sell(token, tokenAmount);
    
  } else if (cmd === 'check') {
    const token = args[1];
    if (!token) {
      console.log('Usage: node degen-trader.js check <TOKEN_MINT>');
      return;
    }
    const bal = await getTokenBalance(token);
    console.log(`\n📊 Token: ${token}`);
    console.log(`Balance: ${bal.uiAmount} (${bal.amount} raw)`);
    
  } else {
    console.log(`
🎰 DEGEN TRADER

Commands:
  balance              Check wallet SOL balance
  buy <MINT> [SOL]     Buy token with SOL (default 0.05 SOL)
  sell <MINT> [AMT]    Sell token (use "all" for full balance)
  check <MINT>         Check token balance

Examples:
  node degen-trader.js balance
  node degen-trader.js buy 7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump 0.1
  node degen-trader.js sell 7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump all
    `);
  }
};

main().catch(console.error);
