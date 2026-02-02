const { Connection, PublicKey } = require('@solana/web3.js');

const WALLET = 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD';
const DARKFLOBI_TOKEN = '7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump';

async function checkBalance() {
  // Try a different RPC
  const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889eff', 'confirmed');
  const pubkey = new PublicKey(WALLET);
  
  // Check SOL balance
  const solBalance = await connection.getBalance(pubkey);
  console.log(`SOL Balance: ${solBalance / 1e9} SOL`);
  
  // Check ALL token accounts including Token-2022
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  });
  
  // Also check Token-2022 program
  let token2022Accounts = { value: [] };
  try {
    token2022Accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
    });
  } catch (e) {}
  
  const allAccounts = [...tokenAccounts.value, ...token2022Accounts.value];
  
  console.log(`\nToken Accounts:`);
  if (allAccounts.length === 0) {
    console.log('  (none yet)');
  } else {
    for (const account of allAccounts) {
      const info = account.account.data.parsed.info;
      const mint = info.mint;
      const amount = info.tokenAmount.uiAmount;
      const isDarkflobi = mint === DARKFLOBI_TOKEN ? ' ← $DARKFLOBI!' : '';
      console.log(`  ${mint}: ${amount}${isDarkflobi}`);
    }
  }
}

checkBalance().catch(console.error);
