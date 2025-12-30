{ pkgs, lib, config, inputs, ... }:

{
  # Bun for frontend (replaces Node.js + npm)
  # NOTE: We use Bun as package manager while keeping Vite as bundler
  # This provides faster installs while maintaining Vite's mature ecosystem

  # Required packages
  packages = with pkgs; [
    bun  # JavaScript runtime and package manager (replaces node + npm)
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
      exec = "bun run dev";
    };
  };

  # Git hooks (replaces husky + lint-staged)
  git-hooks.hooks = {
    # Biome for linting and formatting
    biome = {
      enable = true;
      name = "Biome";
      entry = "bunx biome check --write";
      files = "\\.(ts|tsx|js|jsx|json)$";
      pass_filenames = true;
    };
  };

  # Shell initialization
  enterShell = ''
    echo "🎵 MusiqasiQ development environment"
    echo ""

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
      echo "⚠️  node_modules not found. Run 'bun install' before starting development."
      echo ""
    fi

    echo "Versions:"
    echo "  Bun: $(bun --version)"
    echo "  Docker: $(docker --version 2>/dev/null || echo 'not available')"
    echo ""
    echo "Commands:"
    echo "  devenv up          - Start all services (SurrealDB + Vite)"
    echo "  bun run dev        - Start Vite only"
    echo "  bun run test:e2e   - Run E2E tests (Playwright)"
    echo "  ./scripts/dev-utils.sh   - Development utilities"
    echo ""
    echo "Service URLs:"
    echo "  Frontend:  http://localhost:8080"
    echo "  SurrealDB: http://localhost:8000"
    echo ""
    echo "Git hooks are enabled and run automatically on git commit."
  '';
}
