#!/usr/bin/env bash
set -e

echo "Checking services..."
echo ""

FAILED=0

# Check Vite
echo "1. Checking Vite..."
if curl -sf http://localhost:8080 > /dev/null 2>&1; then
  echo "   ✓ Vite is running (port 8080)"
else
  echo "   ✗ Vite is not responding on port 8080"
  FAILED=1
fi

# Check Wrangler API
echo "2. Checking Wrangler..."
if curl -sf http://localhost:8787 > /dev/null 2>&1; then
  echo "   ✓ Wrangler is running (port 8787)"
else
  echo "   ✗ Wrangler is not responding on port 8787"
  FAILED=1
fi

echo ""
if [ $FAILED -eq 0 ]; then
  echo "✓ All services are healthy!"
  echo ""
  echo "Access points:"
  echo "  Frontend (Vite):    http://localhost:8080"
  echo "  API (Wrangler):     http://localhost:8787"
  exit 0
else
  echo "✗ Some services are not healthy"
  echo "Run 'devenv up' to start all services"
  exit 1
fi
