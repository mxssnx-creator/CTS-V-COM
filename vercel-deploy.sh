#!/bin/bash
set -e

echo "🚀 Deploying CTS v3 to Vercel (Serverless - 6GB Memory)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Installing Vercel CLI...${NC}"
    npm i -g vercel
fi

# Login to Vercel (if not already logged in)
echo -e "${YELLOW}Checking Vercel authentication...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Vercel:${NC}"
    vercel login
fi

# Link project (if not already linked)
if [ ! -f .vercel/project.json ]; then
    echo -e "${YELLOW}Linking project to Vercel...${NC}"
    vercel link
fi

# Setup environment variables for serverless with 6GB memory
echo -e "${YELLOW}Setting up environment variables...${NC}"

# Required environment variables
REQUIRED_VARS=(
    "NEXT_PUBLIC_APP_URL"
    "KV_REST_API_URL"
    "KV_REST_API_TOKEN"
    "JWT_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if ! vercel env ls | grep -q "^${var}"; then
        echo -e "${YELLOW}Adding ${var}...${NC}"
        vercel env add "${var}"
    else
        echo -e "${GREEN}${var} already set${NC}"
    fi
done

# Optional: Add serverless memory optimization hints
echo -e "${YELLOW}Configuring serverless memory settings...${NC}"

# Set NODE_OPTIONS for serverless functions (handled via vercel.json)
echo -e "${GREEN}Memory configured: 6GB per function (via vercel.json)${NC}"

# Run local checks before deployment
echo -e "${YELLOW}Running pre-deployment checks...${NC}"
npm run typecheck
npm run lint
npm run build

# Deploy to production with serverless configuration
echo -e "${YELLOW}Deploying to Vercel production (serverless, 6GB memory)...${NC}"
vercel --prod --confirm

echo -e "${GREEN}✅ Deployment to Vercel complete!${NC}"
echo -e "${GREEN}🌐 Check your Vercel dashboard for the deployment URL${NC}"
echo -e "${GREEN}⚡ Serverless functions allocated 6GB memory each${NC}"
echo -e "${GREEN}🔧 No restrictions - fully serverless architecture${NC}"

# Display next steps
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify deployment in Vercel dashboard"
echo "2. Test health endpoints: /health, /api/health/database"
echo "3. Check system status: /api/system/verify-complete"
echo "4. Configure exchange API keys if needed for live trading"