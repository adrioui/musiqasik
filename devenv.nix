{ pkgs, lib, config, inputs, ... }:

{
  # Required packages
  packages = with pkgs; [
    bun
    curl
    playwright-driver.browsers
  ];

  # Environment variables
  env = {
    NODE_ENV = "development";

    # Playwright configuration
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
  };

  # Process management
  processes = {
    wrangler = {
      exec = "bun run dev:worker";
    };

    vite = {
      exec = "bun run dev";
    };
  };

  # Git hooks
  git-hooks.hooks = {
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

    if [ ! -d "node_modules" ]; then
      echo "⚠️  node_modules not found. Run 'bun install' before starting development."
      echo ""
    fi

    if [ ! -f ".dev.vars" ]; then
      echo "⚠️  .dev.vars not found. Copy .dev.vars.example and add your secrets."
      echo ""
    fi

    echo "Versions:"
    echo "  Bun: $(bun --version)"
    echo ""
    echo "Commands:"
    echo "  devenv up              - Start all services (Wrangler + Vite)"
    echo "  bun run dev:worker     - Start Wrangler only"
    echo "  bun run dev            - Start Vite only"
    echo "  bun run test:e2e       - Run E2E tests"
    echo ""
    echo "Service URLs:"
    echo "  API (Wrangler):  http://localhost:8787"
    echo "  Frontend (Vite): http://localhost:8080"
    echo ""
  '';
}
