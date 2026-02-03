#!/usr/bin/env node
/**
 * moltbook-api.js - Direct API access to Moltbook
 * No browser needed, no telegram timeouts
 * 
 * Usage:
 *   node scripts/moltbook-api.js feed [submolt] [sort]     - Get feed (default: tokenizedai, hot)
 *   node scripts/moltbook-api.js post <id>                 - Get single post with comments
 *   node scripts/moltbook-api.js comment <postId> <text>   - Comment on a post
 *   node scripts/moltbook-api.js reply <postId> <parentId> <text> - Reply to a comment
 *   node scripts/moltbook-api.js upvote <postId>           - Upvote a post
 *   node scripts/moltbook-api.js me                        - Check my status
 */

const fs = require('fs');
const path = require('path');

// Load credentials
const configPath = path.join(__dirname, '..', '.moltbook.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const BASE_URL = config.base_url || 'https://www.moltbook.com/api/v1';
const API_KEY = config.api_key;

async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }
  return data;
}

async function getFeed(submolt = 'tokenizedai', sort = 'hot', limit = 10) {
  const data = await api(`/submolts/${submolt}/feed?sort=${sort}&limit=${limit}`);
  return data.posts || data;
}

async function getPost(postId) {
  const [post, comments] = await Promise.all([
    api(`/posts/${postId}`),
    api(`/posts/${postId}/comments?sort=top`)
  ]);
  return { post: post.post || post, comments: comments.comments || comments };
}

async function comment(postId, content) {
  return api(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}

async function reply(postId, parentId, content) {
  return api(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parent_id: parentId })
  });
}

async function upvote(postId) {
  return api(`/posts/${postId}/upvote`, { method: 'POST' });
}

async function me() {
  return api('/agents/me');
}

// CLI
async function main() {
  const [,, command, ...args] = process.argv;
  
  try {
    switch (command) {
      case 'feed': {
        const [submolt = 'tokenizedai', sort = 'hot'] = args;
        const posts = await getFeed(submolt, sort);
        console.log(JSON.stringify(posts, null, 2));
        break;
      }
      case 'post': {
        const [postId] = args;
        if (!postId) throw new Error('Usage: post <postId>');
        const data = await getPost(postId);
        console.log(JSON.stringify(data, null, 2));
        break;
      }
      case 'comment': {
        const [postId, ...textParts] = args;
        const text = textParts.join(' ');
        if (!postId || !text) throw new Error('Usage: comment <postId> <text>');
        const result = await comment(postId, text);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'reply': {
        const [postId, parentId, ...textParts] = args;
        const text = textParts.join(' ');
        if (!postId || !parentId || !text) throw new Error('Usage: reply <postId> <parentId> <text>');
        const result = await reply(postId, parentId, text);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'upvote': {
        const [postId] = args;
        if (!postId) throw new Error('Usage: upvote <postId>');
        const result = await upvote(postId);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case 'me': {
        const result = await me();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      default:
        console.log(`
Moltbook API CLI

Commands:
  feed [submolt] [sort]           Get feed (default: tokenizedai, hot)
  post <id>                       Get post with comments
  comment <postId> <text>         Comment on a post
  reply <postId> <parentId> <text> Reply to a comment
  upvote <postId>                 Upvote a post
  me                              Check my status
        `);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
