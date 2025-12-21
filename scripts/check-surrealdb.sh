#!/usr/bin/env bash
set -e

echo "Checking SurrealDB Docker container..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "✗ Docker is not running"
  exit 1
fi

# Check if surrealdb container exists and is running
if ! docker ps --format '{{.Names}}' | grep -q "^musiqasik-surrealdb$"; then
  echo "✗ SurrealDB container is not running"
  echo "  Run 'docker compose up -d surrealdb' to start it"
  exit 1
fi

echo "✓ SurrealDB container is running"

# NOTE: This script assumes Docker-compatible CLI semantics.
# On Fedora Silverblue, Podman setups may require additional compatibility layers.

# Wait for SurrealDB to be ready (JSON-RPC ping is more stable than `/health`)
for i in {1..30}; do
  if curl -sf http://localhost:8000/rpc \
    -H "Content-Type: application/json" \
    -d '{"method":"ping","params":[]}' > /dev/null 2>&1; then
    echo "✓ SurrealDB is responding on port 8000"
    exit 0
  fi

  echo "Waiting for SurrealDB... ($i/30)"
  sleep 1
done

echo "✗ SurrealDB failed to respond within 30 seconds"
exit 1
