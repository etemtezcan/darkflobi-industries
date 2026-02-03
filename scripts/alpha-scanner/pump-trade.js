/**
 * Direct pump.fun trading
 * Buys directly from bonding curve - no Jupiter needed
 */

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { readFileSync } from 'fs';

// Config
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const PUMP_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const PUMP_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');
const WALLET_PATH = '../../secrets/solana-wallet.json';

// Associated token program
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function loadWallet() {
  const secretKey = JSON.parse(readFileSync(WALLET_PATH, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

function getAssociatedTokenAddress(mint, owner) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM
  )[0];
}

function getBondingCurvePDA(mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    PUMP_PROGRAM
  )[0];
}

async function getTokenPrice(connection, mint) {
  // Fetch bonding curve data to calculate price
  const bondingCurve = getBondingCurvePDA(new PublicKey(mint));
  const accountInfo = await connection.getAccountInfo(bondingCurve);
  
  if (!accountInfo) {
    throw new Error('Bonding curve not found - token may have graduated');
  }
  
  // Parse bonding curve data (simplified)
  const data = accountInfo.data;
  // Virtual reserves are at specific offsets in the account data
  // This is a simplified calculation
  return { bondingCurve, accountInfo };
}

async function buyPump(tokenMint, solAmount) {
  console.log(`\n🎯 BUYING via pump.fun`);
  console.log(`   Token: ${tokenMint}`);
  console.log(`   Amount: ${solAmount} SOL\n`);
  
  const wallet = loadWallet();
  const connection = new Connection(RPC_URL, 'confirmed');
  const mint = new PublicKey(tokenMint);
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
  
  if (balance < lamports + 10000000) { // +0.01 for fees
    console.log(`❌ Insufficient balance. Have ${balance/LAMPORTS_PER_SOL} SOL`);
    return { success: false, error: 'insufficient balance' };
  }
  
  console.log(`💰 Wallet balance: ${(balance/LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  // Get bonding curve
  const bondingCurve = getBondingCurvePDA(mint);
  console.log(`📊 Bonding curve: ${bondingCurve.toString()}`);
  
  // Get associated token account
  const userATA = getAssociatedTokenAddress(mint, wallet.publicKey);
  console.log(`🏦 User ATA: ${userATA.toString()}`);
  
  // Check if ATA exists
  const ataInfo = await connection.getAccountInfo(userATA);
  
  const tx = new Transaction();
  
  // Add priority fee
  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 })
  );
  
  // Create ATA if needed
  if (!ataInfo) {
    console.log('📝 Creating token account...');
    tx.add(
      new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: userATA, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: false, isWritable: false },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
        ],
        programId: ASSOCIATED_TOKEN_PROGRAM,
        data: Buffer.alloc(0),
      })
    );
  }
  
  // Get bonding curve token account
  const bondingCurveATA = getAssociatedTokenAddress(mint, bondingCurve);
  
  // Build buy instruction
  // pump.fun buy instruction discriminator: [102, 6, 61, 18, 1, 218, 235, 234]
  const buyDiscriminator = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
  
  // Amount and slippage
  const maxSolCost = lamports;
  const minTokens = BigInt(1); // minimum tokens (with slippage this should be calculated)
  
  const instructionData = Buffer.alloc(24);
  buyDiscriminator.copy(instructionData, 0);
  instructionData.writeBigUInt64LE(minTokens, 8);
  instructionData.writeBigUInt64LE(BigInt(maxSolCost), 16);
  
  tx.add(
    new TransactionInstruction({
      keys: [
        { pubkey: new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf'), isSigner: false, isWritable: false }, // global
        { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true }, // fee recipient
        { pubkey: mint, isSigner: false, isWritable: false }, // mint
        { pubkey: bondingCurve, isSigner: false, isWritable: true }, // bonding curve
        { pubkey: bondingCurveATA, isSigner: false, isWritable: true }, // bonding curve token account
        { pubkey: userATA, isSigner: false, isWritable: true }, // user token account
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // user
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
        { pubkey: new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1'), isSigner: false, isWritable: false }, // event authority
        { pubkey: PUMP_PROGRAM, isSigner: false, isWritable: false },
      ],
      programId: PUMP_PROGRAM,
      data: instructionData,
    })
  );
  
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;
  
  // Sign and send
  console.log('🚀 Sending transaction...');
  tx.sign(wallet);
  
  try {
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });
    
    console.log(`\n✅ TX SENT: ${signature}`);
    console.log(`   https://solscan.io/tx/${signature}`);
    
    // Wait for confirmation
    console.log('\n⏳ Confirming...');
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');
    
    if (confirmation.value.err) {
      console.log('❌ Transaction failed:', confirmation.value.err);
      return { success: false, signature, error: confirmation.value.err };
    }
    
    console.log('✅ CONFIRMED!\n');
    return { success: true, signature };
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    return { success: false, error: e.message };
  }
}

// CLI
const args = process.argv.slice(2);
if (args[0] && args[1]) {
  buyPump(args[0], parseFloat(args[1]));
} else {
  console.log('Usage: node pump-trade.js <CA> <SOL_AMOUNT>');
  console.log('Example: node pump-trade.js 5tkrntk4YrT1n39epzkSHygAvTqfi99TYvbhfej6pump 0.1');
}

export { buyPump };
