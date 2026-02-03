const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');

const secretKey = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'secrets', 'solana-wallet.json')));
const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));

console.log('Public Key:', keypair.publicKey.toBase58());
console.log('Private Key (base58):', bs58.default.encode(keypair.secretKey));
