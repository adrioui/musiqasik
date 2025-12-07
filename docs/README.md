# MusiqasiQ Documentation

This directory contains detailed documentation organized by topic. The main `AGENTS.md` file provides high-level onboarding, while these files offer deep dives into specific areas.

## Available Documentation

- `development-workflow.md` - Setup, scripts, and development processes
- `architecture-patterns.md` - System architecture and data flow
- `code-conventions.md` - Coding patterns and conventions (learn from existing code)
- `common-tasks.md` - Step-by-step guides for common operations
- `troubleshooting.md` - Common issues and debugging approaches

## Usage

When working on the project:
1. Read `AGENTS.md` first for essential onboarding
2. Consult relevant documentation files as needed
3. Follow existing code patterns in the codebase
4. Use `file:line` references to examine actual implementations

## Philosophy

This documentation follows **progressive disclosure** principles:
- **AGENTS.md** contains only universally applicable information needed in every session
- **These files** contain detailed information for specific tasks
- **Code patterns** are learned by examining existing implementations, not memorizing rules

## File References

All documentation uses `file:line` references to point to actual code:
- `src/components/ArtistSearch.tsx:24-37` - Search component with debouncing
- `src/hooks/useLastFm.ts:11-33` - API integration hook
- `supabase/functions/lastfm/index.ts:122-187` - Graph building algorithm
- `ForceGraph.tsx:77-84` - D3.js zoom and pan interactions

## Contributing

When updating documentation:
1. Keep information accurate and up-to-date
2. Use `file:line` references instead of copying code
3. Focus on patterns, not rules
4. Update related files when making changes