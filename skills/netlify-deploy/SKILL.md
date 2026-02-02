---
name: netlify-deploy
description: Deploy and manage darkflobi.com on Netlify. Use for website deployments, DNS management, build configuration, deploy previews. Triggers on netlify, deploy, website, darkflobi.com, hosting, build.
---

# Netlify Deployment

Manage darkflobi.com deployments on Netlify.

## Site Details

- **Domain:** darkflobi.com
- **Platform:** Netlify
- **Source:** darkflobi-site/ directory

## Quick Deploy

### CLI Deploy (if netlify-cli installed)
```bash
cd darkflobi-site
netlify deploy --prod
```

### Manual Deploy
1. Build/prepare files in darkflobi-site/
2. Go to app.netlify.com
3. Drag & drop folder or use deploy button

## Project Structure

```
darkflobi-site/
├── index.html      # Main landing page
├── style.css       # Styles (if separate)
├── script.js       # JS (if separate)
├── assets/         # Images, fonts
└── _redirects      # Netlify redirects (optional)
```

## Deployment Workflow

### 1. Make Changes
Edit files in darkflobi-site/

### 2. Test Locally
```bash
cd darkflobi-site
python -m http.server 8000
# or
npx serve .
```

### 3. Deploy
```bash
netlify deploy --prod --dir=darkflobi-site
```

### 4. Verify
Check darkflobi.com in browser

## Common Tasks

### Update Content
1. Edit index.html
2. Deploy

### Add New Page
1. Create new-page.html
2. Link from index.html
3. Deploy

### Update Styles
1. Edit CSS (inline or external)
2. Deploy

### Add Redirects
Create `_redirects` file:
```
/old-path    /new-path    301
/api/*       https://api.darkflobi.com/:splat    200
```

## Environment Variables

Set in Netlify dashboard or netlify.toml:
```toml
[build.environment]
  NODE_VERSION = "18"
```

## Build Settings

For static site (no build):
- Build command: (empty)
- Publish directory: .

For built site:
- Build command: npm run build
- Publish directory: dist

## Browser Fallback

When CLI unavailable:
1. Navigate to app.netlify.com
2. Select darkflobi site
3. Go to Deploys
4. Drag & drop updated files

## Rollback

If deploy breaks:
1. Go to Netlify dashboard
2. Find previous successful deploy
3. Click "Publish deploy"

## DNS/Domain

Domain configured in Netlify:
- darkflobi.com → Netlify
- www.darkflobi.com → redirect to apex

Check DNS propagation: whatsmydns.net
