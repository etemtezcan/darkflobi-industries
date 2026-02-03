#!/usr/bin/env node
/**
 * Quick moltbook post script
 */
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.moltbook.json'), 'utf8'));
const BASE_URL = 'https://www.moltbook.com/api/v1';

async function createPost(submolt, title, content) {
  const response = await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      submolt_name: submolt,
      title: title,
      content: content
    })
  });
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  return data;
}

const submolt = process.argv[2] || 'tokenizedai';
const title = process.argv[3];
const content = process.argv[4];

if (!title || !content) {
  console.log('Usage: node moltbook-post.js <submolt> <title> <content>');
  process.exit(1);
}

createPost(submolt, title, content).catch(console.error);
