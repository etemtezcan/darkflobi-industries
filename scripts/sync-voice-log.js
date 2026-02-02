#!/usr/bin/env node
/**
 * sync-voice-log.js - Sync voice verification log to website
 * Run after approving/posting voice content
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'public', 'voice-verification.json');
const DEST = path.join(__dirname, '..', 'darkflobi-site', 'voice-verification.json');

if (fs.existsSync(SOURCE)) {
  fs.copyFileSync(SOURCE, DEST);
  console.log('✅ Synced voice-verification.json to site');
} else {
  console.log('❌ No voice-verification.json found');
}
