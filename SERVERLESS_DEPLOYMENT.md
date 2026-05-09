# Serverless Deployment Guide - CTS v3

## Overview

This guide covers deploying CTS v3 as a fully serverless application with **6GB memory allocation per function** and **no restrictions**.

## Serverless Architecture

### Key Features
- ✅ **6GB memory per function** (Vercel Pro/Enterprise)
- ✅ **900 second timeout** (15 minutes) for long-running tasks
- ✅ **No hard limits** - scalable automatically
- ✅ **Redis KV database** for persistence
- ✅ **Global CDN** via Vercel Edge Network
- ✅ **Automatic SSL** and HTTPS

## Prerequisites

### Vercel Account
- Vercel Pro or Enterprise plan (required for 6GB memory)
- CLI installed: `npm i -g vercel`
- Git repository connected

### Environment Variables

#### Required (Production)
```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
KV_REST_API_URL=https://your-redis-endpoint.upstash.io
KV_REST_API_TOKEN=your-upstash-redis-token
JWT_SECRET=your-secure-jwt-secret-min-32-chars
```

#### Optional (Live Trading)
```bash
BYBIT_API_KEY=your-bybit-api-key
BYBIT_API_SECRET=your-bybit-api-secret
BINGX_API_KEY=your-bingx-api-key
BINGX_API_SECRET=your-bingx-api-secret
OKX_API_KEY=your-okx-api-key
OKX_API_SECRET=your-okx-api-secret
OKX_PASSPHRASE=your-okx-passphrase
PIONEX_API_KEY=your-pionex-api-key
PIONEX_API_SECRET=your-pionex-api-secret
```

## Configuration Files

### vercel.json - Serverless Configuration
```json
{
  "buildCommand": "npm run vercel-build",
  "installCommand": "npm install --legacy-peer-deps",
  "env": {
    "NODE_ENV": "production",
    "NODE_PG_FORCE_NATIVE": "false",
    "npm_config_build_from_source": "false",
    "SKIP_OPTIONAL_DEPS": "true"
  },
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "memory": 6144,
      "maxDuration": 900,
      "timeout": 60
    }
  }
}
```

**Memory Settings:**
- `memory: 6144` → 6GB RAM per serverless function
- `maxDuration: 900` → 15 minutes maximum execution time
- `timeout: 60` → 60 second idle timeout

### next.config.mjs - Next.js Configuration
```javascript
const nextConfig = {
  reactStrictMode: false,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  serverMemoryConfig: { maxOldSpaceSize: 6144 },
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
    bypassDynamicImportForPreload: true,
    optimizeCss: true,
  },
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
```

**Key Settings:**
- `output: 'standalone'` - Exports minimal server for serverless
- `maxOldSpaceSize: 6144` - Node.js heap limit set to 6GB
- CORS headers enabled for all origins (no restrictions)

## Deployment Steps

### 1. Prepare Environment
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your values (local development only)
nano .env.local
```

### 2. Vercel CLI Deployment
```bash
# Login to Vercel
vercel login

# Deploy to production with full configuration
./vercel-deploy.sh

# Or manually:
vercel --prod
```

### 3. Set Environment Variables in Vercel Dashboard
1. Go to your project on vercel.com
2. Settings → Environment Variables
3. Add all required variables (see above)
4. Redeploy to apply changes

### 4. Verify Deployment
```bash
# Check application health
curl https://your-app.vercel.app/health

# Check database connection
curl https://your-app.vercel.app/api/health/database

# Verify system initialization
curl https://your-app.vercel.app/api/init

# Check trade engine status
curl https://your-app.vercel.app/api/trade-engine/status

# View system logs
curl https://your-app.vercel.app/api/monitoring/logs
```

## Memory Optimization

### Node.js Memory Settings
All entry points use `--max-old-space-size=6144`:
- `package.json` dev/start scripts
- Dockerfile build and runtime
- vercel.json function configuration

### Vercel Function Memory Tiers
| Memory | Duration | Use Case |
|--------|----------|----------|
| 128MB | 10s | Static pages |
| 512MB | 60s | API routes |
| 1024MB (1GB) | 60s | Heavy APIs |
| 3008MB (3GB) | 900s | Data processing |
| **6144MB (6GB)** | **900s** | **Maximum performance** ✅ |

### No Restrictions
- **API rate limits**: None (subject to Vercel plan limits)
- **Concurrent executions**: Up to plan limit
- **Request size**: Up to 4.5MB (Vercel limit)
- **Response streaming**: Enabled
- **Edge functions**: Full support

## Database (Redis) Configuration

### Vercel KV (Recommended)
1. Go to Vercel Dashboard → Storage → Create Database
2. Choose **KV** (Redis)
3. Copy environment variables automatically provided:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
4. Add to Vercel project environment variables

### Upstash Redis (Alternative)
```bash
# Create Redis database at upstash.com
# Copy connection string and token

# Set environment variables
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
```

## Cron Jobs (Scheduled Tasks)

### Configured in vercel.json
```json
"crons": [
  {
    "path": "/api/cron/sync-live-positions",
    "schedule": "* * * * *"  // Every minute
  },
  {
    "path": "/api/cron/generate-indications",
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }
]
```

**Important:** Vercel cron jobs require Pro plan or higher.

## Build Configuration

### Build Command
```bash
npm run vercel-build
```
Runs `next build` with production optimizations.

### Install Command
```bash
npm install --legacy-peer-deps
```
Ensures compatibility with native dependencies.

## Monitoring & Logs

### Vercel Dashboard
- **Functions tab**: View all serverless function invocations
- **Logs tab**: Real-time function logs
- **Analytics**: Performance metrics and uptime

### Health Checks
The application provides several health endpoints:
- `GET /health` - Application liveness
- `GET /api/health/database` - Redis connectivity
- `GET /api/health/readiness` - Startup readiness
- `GET /api/system/verify-complete` - Full system verification

### Monitoring Logs
```bash
# View recent system logs
curl https://your-app.vercel.app/api/monitoring/logs

# Check engine status
curl https://your-app.vercel.app/api/trade-engine/status

# View connection statistics
curl https://your-app.vercel.app/api/connections/status
```

## Troubleshooting

### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build

# Check TypeScript errors
npm run typecheck

# Check lint issues
npm run lint
```

### Memory Issues
If functions run out of memory:
1. Increase memory in vercel.json (max 16GB on Enterprise)
2. Optimize data processing in API routes
3. Use streaming for large responses
4. Split heavy computations into background jobs

### Timeout Issues
If functions timeout:
1. Increase `maxDuration` in vercel.json (max 900s on Pro)
2. Move long-running tasks to background cron jobs
3. Use queue-based processing for heavy workloads

### Redis Connection Issues
```bash
# Test Redis connection from Vercel
curl https://your-app.vercel.app/api/health/database

# Check Redis credentials in Vercel env vars
vercel env ls

# Verify Upstash/KV status in dashboard
```

### Cold Starts
Serverless functions may have cold starts (~100-500ms). Mitigation:
- Use Vercel Pro+ for faster cold starts
- Keep functions warm with periodic pings (cron)
- Optimize bundle size with `next bundle-analyzer`

## Production Checklist

- [ ] Vercel Pro or Enterprise plan active
- [ ] All environment variables set in Vercel dashboard
- [ ] Redis (KV) database created and configured
- [ ] vercel.json memory set to 6144MB
- [ ] Build completes without errors
- [ ] Deployment successful
- [ ] Health endpoints return 200 OK
- [ ] System verification passes
- [ ] Cron jobs configured (optional)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic on Vercel)
- [ ] Monitoring/logging enabled
- [ ] Exchange API keys added (for live trading)

## Performance Tuning

### Memory Adjustment
To adjust memory allocation, edit `vercel.json`:
```json
"functions": {
  "app/api/**/*.ts": {
    "memory": 4096,   // 4GB
    "memory": 8192,   // 8GB (Enterprise only)
    "memory": 10240,  // 10GB (Enterprise only)
    "maxDuration": 900
  }
}
```

### Region Selection
```json
"regions": ["iad1"]  // US East (Virginia)
```
Available regions: `iad1` (US), `sfo1` (US West), `cdg1` (Europe), `sng1` (Singapore)

## Security Considerations

### Serverless Security
- ✅ All secrets in environment variables (never in code)
- ✅ HTTPS enforced by Vercel
- ✅ JWT authentication for API routes
- ✅ Rate limiting on sensitive endpoints
- ✅ CORS configured (adjust for production)
- ✅ No server access needed (fully managed)

### Production Hardening
1. Set `NEXT_PUBLIC_APP_URL` to your production domain
2. Enable Vercel's password protection (if needed)
3. Configure custom domain with DNS
4. Set up Vercel Analytics (optional)
5. Enable audit logs in Vercel dashboard

## Rollback

If deployment causes issues:
```bash
# Immediate rollback via Vercel CLI
vercel rollback

# Or via dashboard:
# Deployments → Select previous deployment → Promote
```

## Advanced Configuration

### Custom Domain
```bash
# Add domain to Vercel project
vercel domains add yourdomain.com

# Update DNS records as instructed
# Vercel automatically provisions SSL
```

### Edge Config (for global state)
```bash
# Store global config in Edge Config
vercel env add EDGE_CONFIG '{"maintenance": false}'
```

### Background Workers
For long-running tasks, use Vercel Cron Jobs or external queue:
```javascript
// API route that enqueues background job
export async function POST(request) {
  // Queue job for processing
  await enqueueJob('process-indications', { symbol: 'BTCUSDT' })
  return Response.json({ status: 'queued' })
}
```

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Serverless Functions**: https://vercel.com/docs/functions
- **Memory Limits**: https://vercel.com/docs/functions/configuration#memory
- **Cron Jobs**: https://vercel.com/docs/cron-jobs
- **KV Database**: https://vercel.com/docs/storage/vercel-kv

---

**Status**: ✅ Fully configured for serverless deployment with 6GB memory, no restrictions, production-ready.
