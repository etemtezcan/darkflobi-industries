const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const secretKey = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'secrets', 'solana-wallet.json')));
const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));

// Verify the keypair works
console.log('Public Key:', keypair.publicKey.toBase58());
console.log('Secret Key Length:', secretKey.length, 'bytes');
console.log('');

// Method 1: Raw array (for Solflare)
console.log('Format 1 - Array (for some wallets):');
console.log(JSON.stringify(secretKey));
console.log('');

// Method 2: Base58 using native approach
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function toBase58(bytes) {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let result = '';
  for (const byte of bytes) {
    if (byte === 0) result += '1';
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += ALPHABET[digits[i]];
  }
  return result;
}

console.log('Format 2 - Base58:');
console.log(toBase58(Uint8Array.from(secretKey)));
console.log('');

// Method 3: Hex
console.log('Format 3 - Hex:');
console.log(Buffer.from(secretKey).toString('hex'));
