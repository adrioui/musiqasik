#!/usr/bin/env bash
set -e

echo "Checking all services..."
echo ""

FAILED=0

# Check Docker
echo "1. Checking Docker..."
if docker info > /dev/null 2>&1; then
  echo "   ✓ Docker is running"
else
  echo "   ✗ Docker is not running"
  FAILED=1
fi

# Check SurrealDB
echo "2. Checking SurrealDB..."
if ./scripts/check-surrealdb.sh > /dev/null 2>&1; then
  echo "   ✓ SurrealDB is healthy (port 8000)"
else
  echo "   ✗ SurrealDB is not healthy"
  FAILED=1
fi

# Check Vite
echo "3. Checking Vite..."
if curl -sf http://localhost:8080 > /dev/null 2>&1; then
  echo "   ✓ Vite is running (port 8080)"
else
  echo "   ✗ Vite is not responding on port 8080"
  FAILED=1
fi

echo ""
if [ $FAILED -eq 0 ]; then
  echo "✓ All services are healthy!"
  echo ""
  echo "Access points:"
  echo "  Frontend:  http://localhost:8080"
  echo "  SurrealDB: http://localhost:8000"
  exit 0
else
  echo "✗ Some services are not healthy"
  exit 1
fi
