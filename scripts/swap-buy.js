const { Connection, Keypair, VersionedTransaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const WALLET_PATH = path.join(__dirname, '..', 'secrets', 'solana-wallet.json');
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const DARKFLOBI_MINT = '7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump';
const JUPITER_API = 'https://public.jupiterapi.com';

async function swapSolForDarkflobi(solAmount) {
  // Load wallet
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log('Wallet:', keypair.publicKey.toBase58());
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Convert SOL to lamports
  const inputAmount = Math.floor(solAmount * 1e9);
  console.log(`Swapping ${solAmount} SOL for $DARKFLOBI...`);
  
  // Get quote from Jupiter public API (very high slippage to test)
  const quoteUrl = `${JUPITER_API}/quote?inputMint=${SOL_MINT}&outputMint=${DARKFLOBI_MINT}&amount=${inputAmount}&slippageBps=2000`;
  console.log('Getting quote...');
  
  const quoteResp = await fetch(quoteUrl);
  const quote = await quoteResp.json();
  
  if (quote.error) {
    console.error('Quote error:', quote.error);
    return;
  }
  
  const outAmount = parseInt(quote.outAmount) / 1e6; // 6 decimals
  console.log(`Quote: ${solAmount} SOL → ${outAmount.toLocaleString()} $DARKFLOBI`);
  
  // Get swap transaction
  console.log('Building swap transaction...');
  const swapResp = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    })
  });
  
  const swapData = await swapResp.json();
  
  if (swapData.error) {
    console.error('Swap error:', swapData.error);
    return;
  }
  
  // Deserialize and sign transaction
  const swapTxBuf = Buffer.from(swapData.swapTransaction, 'base64');
  const tx = VersionedTransaction.deserialize(swapTxBuf);
  tx.sign([keypair]);
  
  // Send transaction (skip preflight for speed)
  console.log('Sending transaction...');
  const txid = await connection.sendTransaction(tx, {
    skipPreflight: true,
    maxRetries: 5,
    preflightCommitment: 'confirmed'
  });
  
  console.log('Transaction sent!');
  console.log(`TX: https://solscan.io/tx/${txid}`);
  
  // Wait for confirmation
  console.log('Waiting for confirmation...');
  const confirmation = await connection.confirmTransaction(txid, 'confirmed');
  
  if (confirmation.value.err) {
    console.error('Transaction failed:', confirmation.value.err);
  } else {
    console.log('SUCCESS! Swap complete.');
  }
  
  return txid;
}

// Execute with 0.25 SOL
swapSolForDarkflobi(0.25);
