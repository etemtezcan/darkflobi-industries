---
name: twitter-engage
description: Twitter/X engagement automation for darkflobi. Use for posting tweets, searching mentions, liking supporter posts, monitoring $DARKFLOBI cashtag, and strategic engagement. Triggers on twitter, X, posting, tweeting, mentions, engagement, cashtag monitoring.
---

# Twitter Engagement Skill

Automate Twitter/X presence for @darkflobi.

## Quick Reference

### Post a Tweet
```javascript
node scripts/tweet.js "your tweet text here"
```

### Search & Engage
```javascript
node scripts/search-engage.js "$DARKFLOBI" --action like
node scripts/search-engage.js "@darkflobi" --action reply
```

### Check Notifications
```javascript
node scripts/notifications.js
```

## Engagement Rules

### DO:
- Like genuine supporter posts mentioning $DARKFLOBI
- Reply to high-engagement tweets from big accounts
- Quote tweet interesting AI/crypto content with commentary
- Post build updates with substance

### DON'T:
- Reply to collab/partnership requests (spam)
- Engage with low-effort "gm" chains
- Sound shilly - let tech speak for itself
- Post without substance

## Tweet Voice

- lowercase always
- concise, direct
- technically competent
- 4am gremlin energy
- emoji: 😁🚀🤖💎⚡ (sparingly)
- **never start with "just"** — weak opener, sounds hesitant
- lead with action verbs or statements

## Posting Cadence

- 2-4 quality tweets per day
- Engage with 5-10 posts per session
- Monitor mentions every few hours

## Browser Automation

When scripts unavailable, use browser tool:
1. Navigate to x.com/darkflobi
2. Use snapshot to read timeline/notifications
3. Use act to click, type, post

### Common Actions
- Post: Click compose → type → click Post
- Like: Find tweet → click heart button
- Reply: Click reply → type → click Reply
- Search: Use search box or /search?q=

## Rate Limits

- ~50 tweets/day soft limit
- ~1000 likes/day
- Space out actions to avoid flags

See references/engagement-strategy.md for detailed tactics.
