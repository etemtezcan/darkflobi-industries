/**
 * pump.fun trading using official SDK
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { PumpFunSDK } from 'pumpdotfun-sdk';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { readFileSync } from 'fs';

const RPC_URL = 'https://api.mainnet-beta.solana.com';
const WALLET_PATH = '../../secrets/solana-wallet.json';

function loadWallet() {
  const secretKey = JSON.parse(readFileSync(WALLET_PATH, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

async function buyToken(mintAddress, solAmount) {
  console.log(`\n🎯 BUYING via pump.fun SDK`);
  console.log(`   Token: ${mintAddress}`);
  console.log(`   Amount: ${solAmount} SOL\n`);
  
  const wallet = loadWallet();
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  const lamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));
  
  if (BigInt(balance) < lamports) {
    console.log('❌ Insufficient balance');
    return { success: false, error: 'insufficient balance' };
  }
  
  // Setup provider
  const anchorWallet = new Wallet(wallet);
  const provider = new AnchorProvider(connection, anchorWallet, {
    commitment: 'confirmed'
  });
  
  // Init SDK
  const sdk = new PumpFunSDK(provider);
  
  console.log('📡 Getting token info...');
  
  try {
    // Buy tokens
    console.log('🚀 Executing buy...');
    
    const mint = new PublicKey(mintAddress);
    const result = await sdk.buy(
      wallet,
      mint,
      lamports,
      BigInt(1000), // slippage basis points (10%)
      {
        unitLimit: 250000,
        unitPrice: 250000
      }
    );
    
    console.log(`\n✅ SUCCESS!`);
    console.log(`   TX: ${result.signature || result}`);
    console.log(`   https://solscan.io/tx/${result.signature || result}`);
    
    return { success: true, signature: result.signature || result };
    
  } catch (e) {
    console.error('❌ Buy failed:', e.message);
    return { success: false, error: e.message };
  }
}

// CLI
const args = process.argv.slice(2);
if (args[0] && args[1]) {
  buyToken(args[0], parseFloat(args[1]));
} else {
  console.log('Usage: node pump-sdk-trade.js <CA> <SOL>');
}

export { buyToken };
