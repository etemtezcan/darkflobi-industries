const { Connection, Keypair, VersionedTransaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const WALLET_PATH = path.join(__dirname, '..', 'secrets', 'solana-wallet.json');
const DARKFLOBI_MINT = '7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump';

async function pumpBuy(solAmount) {
  // Load wallet
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log('Wallet:', keypair.publicKey.toBase58());
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  console.log(`Buying $DARKFLOBI with ${solAmount} SOL via pump.fun...`);
  
  // Use pump.fun trade API
  const response = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: keypair.publicKey.toBase58(),
      action: 'buy',
      mint: DARKFLOBI_MINT,
      amount: solAmount * LAMPORTS_PER_SOL,
      denominatedInSol: 'true',
      slippage: 10,
      priorityFee: 0.0005,
      pool: 'auto'
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error('API Error:', response.status, text);
    return;
  }
  
  const txData = await response.arrayBuffer();
  const tx = VersionedTransaction.deserialize(new Uint8Array(txData));
  tx.sign([keypair]);
  
  console.log('Sending transaction...');
  const txid = await connection.sendTransaction(tx, {
    skipPreflight: true,
    maxRetries: 5
  });
  
  console.log('Transaction sent!');
  console.log(`TX: https://solscan.io/tx/${txid}`);
  
  console.log('Waiting for confirmation...');
  const confirmation = await connection.confirmTransaction(txid, 'confirmed');
  
  if (confirmation.value.err) {
    console.error('Transaction failed:', confirmation.value.err);
  } else {
    console.log('SUCCESS! Buy complete.');
  }
  
  return txid;
}

pumpBuy(0.25);
