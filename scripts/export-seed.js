const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const secretKey = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'secrets', 'solana-wallet.json')));

// First 32 bytes is the seed
const seed = secretKey.slice(0, 32);

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

console.log('32-byte Seed (base58):');
console.log(toBase58(Uint8Array.from(seed)));
