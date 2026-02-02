const { Connection, PublicKey } = require('@solana/web3.js');

const WALLET = 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD';
const DARKFLOBI_TOKEN = '7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump';

async function checkBalance() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const pubkey = new PublicKey(WALLET);
  
  // Check SOL balance
  const solBalance = await connection.getBalance(pubkey);
  console.log(`SOL Balance: ${solBalance / 1e9} SOL`);
  
  // Check old Token program
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  });
  
  // Check Token-2022 program (used by pump.fun tokens)
  const token2022Accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
  });
  
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
      console.log(`  ${mint}: ${amount.toLocaleString()}${isDarkflobi}`);
    }
  }
}

checkBalance().catch(console.error);
