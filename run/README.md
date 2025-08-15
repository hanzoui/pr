# gh-service: GitHub Repository Event Monitor

Real-time monitoring system for GitHub repository events across multiple repositories.

## Features

- **Real-time notifications** for issues, PRs, comments, and label changes
- **Dual mode support**: Webhooks (real-time) or Polling (30s interval)
- **Multi-repository monitoring** across 4 Comfy-Org repositories
- **Secure webhook verification** with HMAC signatures
- **Automatic webhook setup** with graceful fallback to polling

## Quick Start

### Polling Mode (Default)

```bash
bun run run/gh-service.tsx
```

### Webhook Mode (Real-time)

```bash
export USE_WEBHOOKS=true
export GITHUB_WEBHOOK_SECRET=your-webhook-secret
export WEBHOOK_BASE_URL=https://your-public-domain.com
bun run run/gh-service.tsx
```

## Getting Your Webhook Secret

### Option 1: Generate a Secure Random Secret (Recommended)

```bash
# Generate a 32-byte random hex string
node -e "console.log('GITHUB_WEBHOOK_SECRET='+require('crypto').randomBytes(32).toString('hex'))" >> .env.local

# Or use openssl
openssl rand -hex 32

# Or use Bun
bun -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

Example output: `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

### Option 2: Use a Password Generator

Visit [1Password Generator](https://1password.com/password-generator/) or similar:

- Length: 64 characters
- Include: Letters, Numbers, Symbols
- Copy the generated password

### Option 3: Custom Secret (Less Secure)

```bash
export GITHUB_WEBHOOK_SECRET="my-super-secret-webhook-password-2024"
```

⚠️ **Security Note**: Use a long, random, unique secret that you don't use anywhere else.

## Environment Variables

| Variable                | Required     | Description                     | Example                  |
| ----------------------- | ------------ | ------------------------------- | ------------------------ |
| `USE_WEBHOOKS`          | No           | Enable webhook mode             | `true`                   |
| `GITHUB_WEBHOOK_SECRET` | Webhook mode | Secret for webhook verification | `abc123...`              |
| `WEBHOOK_BASE_URL`      | Webhook mode | Your public URL                 | `https://myapp.ngrok.io` |
| `GH_TOKEN`              | Yes          | GitHub token with repo access   | `ghp_xxx...`             |
| `PORT`                  | No           | Server port                     | `3000`                   |

## GitHub Token Setup

1. Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `admin:repo_hook` (Read and write repository hooks)
4. Copy the token and set it as `GH_TOKEN`

```bash
export GH_TOKEN=ghp_your_github_token_here
```

## Making Your Server Public (For Webhooks)

### Development - Using ngrok

1. Install ngrok: https://ngrok.com/download
2. Start your server: `bun run run/gh-service.tsx`
3. In another terminal: `ngrok http 3000`
4. Copy the HTTPS URL: `https://abc123.ngrok.io`
5. Set environment variable: `export WEBHOOK_BASE_URL=https://abc123.ngrok.io`

### Development - Using Cloudflare Tunnel

```bash
# Install cloudflared
npm install -g @cloudflare/next-on-pages

# Start tunnel
cloudflared tunnel --url http://localhost:3000

# Copy the HTTPS URL and set WEBHOOK_BASE_URL
```

### Production Deployment

Deploy to any cloud provider:

- **Vercel**: `vercel --prod`
- **Railway**: `railway deploy`
- **Heroku**: `git push heroku main`
- **DigitalOcean**: App Platform
- **AWS**: Lambda/EC2
- **Google Cloud**: Cloud Run

## Complete Setup Example

```bash
# 1. Generate webhook secret
export GITHUB_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Set your GitHub token
export GH_TOKEN=ghp_your_github_personal_access_token

# 3. Make server public (development)
ngrok http 3000 &  # Run in background
export WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io

# 4. Enable webhook mode
export USE_WEBHOOKS=true

# 5. Start the monitor
bun run run/gh-service.tsx
```

## Event Types Monitored

- 🆕 **New Issues** - When someone opens an issue
- 🔄 **New Pull Requests** - When someone creates a PR
- 💬 **Comments** - Issue comments, PR comments, review comments
- 🏷️ **Labels** - When labels are added or removed
- ✅ **Status Changes** - Issue/PR closed, reopened, merged

## Webhook vs Polling Comparison

| Feature                | Polling (30s)     | Webhooks             |
| ---------------------- | ----------------- | -------------------- |
| **Latency**            | ~30 seconds       | ~1 second            |
| **API Rate Limit**     | High usage        | Minimal usage        |
| **Setup Complexity**   | Simple            | Moderate             |
| **Reliability**        | Always works      | Network dependent    |
| **Resource Usage**     | Higher CPU/Memory | Lower                |
| **GitHub Permissions** | Read-only         | Admin/Write required |

## Troubleshooting

### "Error creating webhook: 403 Forbidden"

- Your GitHub token needs `admin:repo_hook` permissions
- You need admin or write access to the repositories

### "Webhook endpoint not reachable"

- Ensure your `WEBHOOK_BASE_URL` is publicly accessible
- Test: `curl -X POST https://your-url.com/webhook`

### "Webhook signature verification failed"

- Check that `GITHUB_WEBHOOK_SECRET` matches what you configured
- Ensure the secret is the same when creating webhooks

### No webhook events received

- Check GitHub webhook delivery logs in repo settings → Webhooks
- Verify the webhook URL is correct: `https://your-domain.com/webhook`
- Ensure your server is running and accessible

## Security Best Practices

1. **Use strong webhook secrets** - Generate random 64+ character strings
2. **Use HTTPS** - Never use HTTP for webhook endpoints in production
3. **Verify signatures** - The system automatically verifies webhook authenticity
4. **Rotate secrets periodically** - Update webhook secrets every 90 days
5. **Limit token permissions** - Only grant necessary GitHub token scopes

## Monitored Repositories

The system monitors these repositories by default:

- `Comfy-Org/Comfy-PR`
- `comfyanonymous/ComfyUI`
- `Comfy-Org/ComfyUI_frontend`
- `Comfy-Org/desktop`

To modify the list, edit the `REPOLIST` array in `gh-service.tsx`.
