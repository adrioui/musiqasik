#!/usr/bin/env bash
set -e

case "$1" in
  "lint")
    echo "Running Biome linter..."
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
  "clean")
    echo "Cleaning development environment..."
    rm -rf node_modules
    rm -rf .devenv
    rm -rf dist
    echo "Clean complete. Run 'bun install' to reinstall dependencies."
    ;;
  *)
    echo "MusiqasiQ Development Utilities"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  lint      - Run Biome linter"
    echo "  typecheck - Run TypeScript type check"
    echo "  check     - Run all checks (lint + typecheck + services)"
    echo "  test      - Run unit tests"
    echo "  test:e2e  - Run E2E tests"
    echo "  clean     - Clean all build artifacts"
    exit 1
    ;;
esac
