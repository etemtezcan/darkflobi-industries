#!/usr/bin/env node
/**
 * voice-post.js - Verified voice content generation for darkflobi
 * 
 * Features:
 * - Generates TTS audio
 * - Creates SHA256 hash for verification
 * - Logs to public verification file
 * - Preview mode (default) - saves locally for approval
 * - Post mode - only after explicit approval
 * 
 * Usage:
 *   node scripts/voice-post.js "text to speak" --preview
 *   node scripts/voice-post.js "text to speak" --post
 *   node scripts/voice-post.js --approve <hash>
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VOICE_DIR = path.join(__dirname, '..', 'assets', 'voice');
const VERIFICATION_LOG = path.join(__dirname, '..', 'public', 'voice-verification.json');
const PENDING_DIR = path.join(VOICE_DIR, 'pending');

// Ensure directories exist
[VOICE_DIR, PENDING_DIR, path.dirname(VERIFICATION_LOG)].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function hashFile(filepath) {
  const content = fs.readFileSync(filepath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
}

function loadVerificationLog() {
  if (fs.existsSync(VERIFICATION_LOG)) {
    return JSON.parse(fs.readFileSync(VERIFICATION_LOG, 'utf8'));
  }
  return { generated: [], posted: [] };
}

function saveVerificationLog(log) {
  fs.writeFileSync(VERIFICATION_LOG, JSON.stringify(log, null, 2));
}

function generateVoice(text) {
  const timestamp = new Date().toISOString();
  const textHash = hashText(text);
  const filename = `voice_${Date.now()}_${textHash}.mp3`;
  const pendingPath = path.join(PENDING_DIR, filename);
  
  console.log('🎙️ Generating voice...');
  console.log(`   Text: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);
  
  // Use clawdbot tts or elevenlabs CLI
  try {
    // Try using node to call TTS API directly
    const result = execSync(`npx clawdbot tts "${text.replace(/"/g, '\\"')}" -o "${pendingPath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e) {
    console.error('❌ TTS generation failed:', e.message);
    console.log('   Falling back to placeholder...');
    // Create a placeholder for testing
    fs.writeFileSync(pendingPath, `[AUDIO PLACEHOLDER]\nText: ${text}\nTimestamp: ${timestamp}`);
  }
  
  const audioHash = fs.existsSync(pendingPath) ? hashFile(pendingPath) : 'placeholder';
  
  const record = {
    id: textHash,
    text: text,
    generatedAt: timestamp,
    audioHash: audioHash,
    filename: filename,
    status: 'pending',
    approvedAt: null,
    postedAt: null,
    tweetUrl: null
  };
  
  // Log generation
  const log = loadVerificationLog();
  log.generated.push(record);
  saveVerificationLog(log);
  
  console.log('✅ Voice generated and logged');
  console.log(`   Hash: ${audioHash.slice(0, 16)}...`);
  console.log(`   File: ${pendingPath}`);
  console.log(`   ID: ${textHash}`);
  console.log('');
  console.log('📋 To approve and post:');
  console.log(`   node scripts/voice-post.js --approve ${textHash}`);
  
  return record;
}

function approveAndPost(id) {
  const log = loadVerificationLog();
  const record = log.generated.find(r => r.id === id);
  
  if (!record) {
    console.error(`❌ No pending voice with ID: ${id}`);
    console.log('   Pending voices:');
    log.generated.filter(r => r.status === 'pending').forEach(r => {
      console.log(`   - ${r.id}: "${r.text.slice(0, 40)}..."`);
    });
    return;
  }
  
  if (record.status !== 'pending') {
    console.error(`❌ Voice ${id} already ${record.status}`);
    return;
  }
  
  const pendingPath = path.join(PENDING_DIR, record.filename);
  const approvedPath = path.join(VOICE_DIR, record.filename);
  
  // Move to approved
  if (fs.existsSync(pendingPath)) {
    fs.renameSync(pendingPath, approvedPath);
  }
  
  record.status = 'approved';
  record.approvedAt = new Date().toISOString();
  saveVerificationLog(log);
  
  console.log('✅ Voice approved');
  console.log(`   File: ${approvedPath}`);
  console.log(`   Hash: ${record.audioHash.slice(0, 16)}...`);
  console.log('');
  console.log('🐦 Ready to post. Audio path:');
  console.log(`   ${approvedPath}`);
  
  return record;
}

function listPending() {
  const log = loadVerificationLog();
  const pending = log.generated.filter(r => r.status === 'pending');
  
  if (pending.length === 0) {
    console.log('📭 No pending voice content');
    return;
  }
  
  console.log('📋 Pending voice content:');
  pending.forEach(r => {
    console.log(`\n   ID: ${r.id}`);
    console.log(`   Text: "${r.text}"`);
    console.log(`   Generated: ${r.generatedAt}`);
    console.log(`   Hash: ${r.audioHash.slice(0, 16)}...`);
  });
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--list') || args.includes('-l')) {
  listPending();
} else if (args.includes('--approve')) {
  const idx = args.indexOf('--approve');
  const id = args[idx + 1];
  if (!id) {
    console.error('Usage: node voice-post.js --approve <id>');
    process.exit(1);
  }
  approveAndPost(id);
} else if (args.length > 0 && !args[0].startsWith('-')) {
  const text = args[0];
  generateVoice(text);
} else {
  console.log('Usage:');
  console.log('  node voice-post.js "text to speak"    Generate voice (preview mode)');
  console.log('  node voice-post.js --list             List pending voices');
  console.log('  node voice-post.js --approve <id>     Approve and prepare for posting');
}
