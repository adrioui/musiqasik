{ pkgs, lib, config, inputs, ... }:

{
  # Node.js for frontend (provides node + npm)
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_20;
  };

  # Rust for WASM module
  #
  # NOTE: This repository already contains `rust/graph-wasm/rust-toolchain.toml`.
  # Keep that file as the source of truth for the Rust version to avoid mismatches.
  # The channel must be explicitly set when using targets (nixpkgs channel doesn't support cross-compiling).
  languages.rust = {
    enable = true;
    channel = "stable";
    targets = [ "wasm32-unknown-unknown" ];
  };

  # Required packages (do not duplicate node/npm here; `languages.javascript` provides them)
  packages = with pkgs; [
    wasm-pack
    # NOTE: `wasm-pack` vendors `wasm-bindgen`; installing `wasm-bindgen-cli` separately can cause version skew.
    binaryen  # Provides wasm-opt
    curl

    # Docker client tools
    # NOTE: devenv should not try to "manage Docker" itself; it only needs client tools.
    # We standardize on `docker compose` (v2 plugin syntax) throughout this plan.
    #
    # IMPORTANT: `docker` from nixpkgs does not reliably include a working `docker compose` subcommand.
    # Include an explicit Compose implementation so `docker compose ...` works across Linux/macOS setups.
    docker
    docker-compose

    # Playwright: Nix provides browsers; npm provides the Playwright JS runtime (`@playwright/test`)
    playwright-driver.browsers
  ];

  # Environment variables
  env = {
    NODE_ENV = "development";

    # SurrealDB connection
    VITE_SURREALDB_NAMESPACE = "musiqasik";
    VITE_SURREALDB_DATABASE = "main";
    VITE_SURREALDB_USER = "root";
    VITE_SURREALDB_PASS = "root";
    VITE_SURREALDB_WS_URL = "ws://localhost:8000/rpc";
    VITE_SURREALDB_HTTP_URL = "http://localhost:8000/rpc";

    # WASM defaults
    VITE_USE_WASM_GRAPH = "false";
    VITE_WASM_DEBUG = "false";

    # Playwright configuration
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
  };

  # Process management
  #
  # NOTE: devenv does not auto-run `docker-compose.yml`. Define explicit processes and wire dependencies.
  processes = {
    surrealdb = {
      # IMPORTANT:
      # `devenv processes` expects a long-running foreground process.
      # Avoid `docker compose up -d` here (it exits immediately and breaks lifecycle/readiness semantics).
      exec = "docker compose up surrealdb";
    };

    vite = {
      exec = "npm run dev";
    };
  };

  # Git hooks (replaces husky + lint-staged)
  # Note: Using only custom hooks as built-in hooks have compatibility issues with current devenv version
  git-hooks.hooks = {
    # Custom ESLint hook
    eslint = {
      enable = true;
      name = "ESLint";
      entry = "npm run lint -- --fix";
      files = "\\.(ts|tsx|js|jsx)$";
      pass_filenames = false;
    };

    # Custom Prettier hook
    prettier = {
      enable = true;
      name = "Prettier";
      entry = "npx prettier --write --ignore-unknown";
      files = "\\.(ts|tsx|js|jsx|css|md|json)$";
      pass_filenames = true;
    };
  };

  # Shell initialization
  enterShell = ''
    echo "🎵 MusiqasiQ development environment"
    echo ""
    echo "Versions:"
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"
    echo "  Rust: $(rustc --version)"
    echo "  wasm-pack: $(wasm-pack --version)"
    echo "  Docker: $(docker --version 2>/dev/null || echo 'not available')"
    echo ""
    echo "Commands:"
    echo "  devenv up          - Start all services (SurrealDB + Vite)"
    echo "  npm run dev        - Start Vite only"
    echo "  npm run wasm:build - Build WASM module"
    echo "  npm run test:e2e   - Run E2E tests (Playwright)"
    echo "  ./scripts/dev-utils.sh   - Development utilities"
    echo ""
    echo "Service URLs:"
    echo "  Frontend:  http://localhost:8080"
    echo "  SurrealDB: http://localhost:8000"
    echo ""
    echo "Git hooks are enabled and run automatically on git commit."
  '';
}
