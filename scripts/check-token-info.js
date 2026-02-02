const { Connection, PublicKey } = require('@solana/web3.js');

const DARKFLOBI_MINT = '7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump';

async function checkToken() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const mintInfo = await connection.getParsedAccountInfo(new PublicKey(DARKFLOBI_MINT));
  console.log('Token Info:');
  console.log(JSON.stringify(mintInfo.value?.data, null, 2));
}

checkToken();
