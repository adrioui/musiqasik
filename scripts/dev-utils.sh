#!/usr/bin/env bash
set -e

case "$1" in
  "lint")
    echo "Running ESLint..."
    bun run lint
    ;;
  "typecheck")
    echo "Running TypeScript type check..."
    bun run typecheck
    ;;
  "check")
    echo "Running all checks..."
    bun run lint
    bun run typecheck
    echo ""
    echo "Running service health check..."
    ./scripts/check-services.sh
    ;;
  "test")
    echo "Running unit tests..."
    bun run test
    ;;
  "test:e2e")
    echo "Running E2E tests..."
    bun run test:e2e
    ;;
  "wasm")
    echo "Building WASM module..."
    bun run wasm:build
    ;;
  "clean")
    echo "Cleaning development environment..."
    rm -rf node_modules
    rm -rf .devenv
    rm -rf dist
    rm -rf src/wasm/pkg
    echo "Clean complete. Run 'bun install' to reinstall dependencies."
    ;;
  "reset-db")
    echo "Resetting SurrealDB..."
    docker compose down -v
    docker compose up -d surrealdb
    sleep 3
    if [ -f ./surrealdb/schema.surql ]; then
      docker exec -i musiqasik-surrealdb /surreal import --conn http://localhost:8000 --user root --pass root --ns musiqasik --db main < ./surrealdb/schema.surql
    fi
    echo ""
    echo "Threat model note:"
    echo "- Dev-only credentials (root/root)"
    echo "- Bound to localhost"
    echo "- Not stored persistently by this repo"
    echo "- Resettable with: docker compose down -v"
    echo ""
    echo "Database reset complete."
    ;;
  *)
    echo "MusiqasiQ Development Utilities"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  lint      - Run ESLint"
    echo "  typecheck - Run TypeScript type check"
    echo "  check     - Run all checks (lint + typecheck + services)"
    echo "  test      - Run unit tests"
    echo "  test:e2e  - Run E2E tests"
    echo "  wasm      - Build WASM module"
    echo "  clean     - Clean all build artifacts"
    echo "  reset-db  - Reset SurrealDB to clean state"
    exit 1
    ;;
esac
