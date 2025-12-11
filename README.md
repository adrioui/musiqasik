# MusiqasiQ

## Development

This project uses standard React development tools. See [Development Workflow](docs/development-workflow.md) for setup instructions.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd musiqasik

# Step 3: Install the necessary dependencies
npm i

# Step 4: Start the development server with auto-reloading and an instant preview
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Deploy using your preferred hosting platform (Vercel, Netlify, etc.).

## Can I connect a custom domain?

Yes, you can!

Refer to the documentation of your hosting provider for instructions on setting up a custom domain.

## Documentation

This project uses progressive disclosure for documentation:

- **`AGENTS.md`** - Concise onboarding for AI agents (64 lines)
- **`docs/` directory** - Detailed documentation organized by topic:
  - `development-workflow.md` - Setup, scripts, and development processes
  - `architecture-patterns.md` - System design and data flow
  - `code-conventions.md` - Coding patterns and conventions
  - `common-tasks.md` - Step-by-step guides for common operations
  - `troubleshooting.md` - Common issues and debugging approaches

For AI agents working on this project, start with `AGENTS.md` and consult the `docs/` files as needed for specific topics.
