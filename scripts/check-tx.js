const { Connection } = require('@solana/web3.js');

const TX_SIG = '62quJ2owqi2QQhDJQdn8fuRmriA9efETrxu8crf65hZKJfiywTbAd4xGw275aav5J31Fgx2o6A6a58Z79ASLiD4j';

async function checkTx() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const tx = await connection.getParsedTransaction(TX_SIG, {
    maxSupportedTransactionVersion: 0
  });
  
  if (!tx) {
    console.log('Transaction not found');
    return;
  }
  
  console.log('Status:', tx.meta?.err ? 'FAILED' : 'SUCCESS');
  console.log('Slot:', tx.slot);
  console.log('\nInstructions:');
  
  for (const ix of tx.transaction.message.instructions) {
    if (ix.parsed) {
      console.log(JSON.stringify(ix.parsed, null, 2));
    } else {
      console.log('Program:', ix.programId.toString());
    }
  }
}

checkTx().catch(console.error);
