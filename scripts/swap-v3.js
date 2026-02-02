const { Connection, Keypair, VersionedTransaction, ComputeBudgetProgram, TransactionMessage } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const WALLET_PATH = path.join(__dirname, '..', 'secrets', 'solana-wallet.json');
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const DARKFLOBI_MINT = '7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump';
const JUPITER_API = 'https://public.jupiterapi.com';

async function swap(solAmount) {
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log('Wallet:', keypair.publicKey.toBase58());
  
  // Use a faster RPC
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const inputAmount = Math.floor(solAmount * 1e9);
  console.log(`Swapping ${solAmount} SOL for $DARKFLOBI...`);
  
  // Get fresh quote
  console.log('Getting quote...');
  const quoteResp = await fetch(
    `${JUPITER_API}/quote?inputMint=${SOL_MINT}&outputMint=${DARKFLOBI_MINT}&amount=${inputAmount}&slippageBps=1500&onlyDirectRoutes=true`
  );
  const quote = await quoteResp.json();
  
  if (quote.error) {
    console.error('Quote error:', quote.error);
    return;
  }
  
  console.log(`Quote: ${solAmount} SOL → ${(parseInt(quote.outAmount) / 1e6).toLocaleString()} $DARKFLOBI`);
  
  // Get swap with specific settings
  console.log('Building swap...');
  const swapResp = await fetch(`${JUPITER_API}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      useSharedAccounts: true,
      dynamicComputeUnitLimit: true,
      skipUserAccountsRpcCalls: false,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 1000000,
          priorityLevel: "veryHigh"
        }
      }
    })
  });
  
  const swapData = await swapResp.json();
  
  if (swapData.error) {
    console.error('Swap error:', swapData.error);
    return;
  }
  
  // Sign and send IMMEDIATELY
  const tx = VersionedTransaction.deserialize(Buffer.from(swapData.swapTransaction, 'base64'));
  tx.sign([keypair]);
  
  console.log('Sending...');
  
  // Send with retries
  let txid;
  for (let i = 0; i < 3; i++) {
    try {
      txid = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
        maxRetries: 0
      });
      console.log(`Attempt ${i+1} - TX: https://solscan.io/tx/${txid}`);
      break;
    } catch (e) {
      console.log(`Attempt ${i+1} failed:`, e.message);
    }
  }
  
  if (!txid) {
    console.error('All send attempts failed');
    return;
  }
  
  // Poll for confirmation
  console.log('Confirming...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const status = await connection.getSignatureStatus(txid);
    if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
      if (status.value.err) {
        console.error('TX failed:', JSON.stringify(status.value.err));
      } else {
        console.log('SUCCESS!');
      }
      return txid;
    }
    process.stdout.write('.');
  }
  
  console.log('\nTimeout waiting for confirmation');
  return txid;
}

swap(0.25);
