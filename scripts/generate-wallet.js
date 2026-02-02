const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Generate a new keypair
const keypair = Keypair.generate();

// Get the public key (wallet address)
const publicKey = keypair.publicKey.toBase58();

// Get the secret key (private key) as array
const secretKey = Array.from(keypair.secretKey);

// Save secret key to a secure file (DO NOT SHARE THIS)
const secretPath = path.join(__dirname, '..', 'secrets', 'solana-wallet.json');
fs.mkdirSync(path.dirname(secretPath), { recursive: true });
fs.writeFileSync(secretPath, JSON.stringify(secretKey));

console.log('='.repeat(60));
console.log('DARKFLOBI AGENT WALLET GENERATED');
console.log('='.repeat(60));
console.log('');
console.log('PUBLIC ADDRESS (share this):');
console.log(publicKey);
console.log('');
console.log('SECRET KEY saved to: secrets/solana-wallet.json');
console.log('⚠️  NEVER SHARE THE SECRET KEY FILE');
console.log('='.repeat(60));
