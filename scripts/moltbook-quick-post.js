#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.moltbook.json'), 'utf8'));
const BASE_URL = 'https://www.moltbook.com/api/v1';

async function createPost(data) {
  console.log('Posting to moltbook...');
  console.log('Submolt:', data.submolt);
  console.log('Title:', data.title);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout
  
  try {
    const response = await fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        submolt_name: data.submolt,
        title: data.title,
        content: data.content
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.log('Request timed out after 45 seconds');
    } else {
      console.error('Error:', err.message);
    }
    throw err;
  }
}

const inputFile = process.argv[2] || 'temp/moltbook-post-content.json';
const postData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
createPost(postData).catch(e => process.exit(1));
