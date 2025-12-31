---
description: Create worktree and launch implementation session for a plan
---

# Create Worktree

Create a new git worktree and launch an OpenCode implementation session.

## Process:

1. **Gather information from user:**
   - Branch name (required)
   - Path to plan file (relative path starting with `thoughts/shared/...`)
   - Base branch (optional, defaults to current branch)

2. **Set up worktree:**
   Read `hack/create_worktree.sh` and create a new worktree:
   ```bash
   ./hack/create_worktree.sh BRANCH_NAME [BASE_BRANCH]
   ```

3. **Determine required data:**
   - branch name
   - path to plan file (use relative path only)
   - launch prompt
   - command to run

   **IMPORTANT PATH USAGE:**
   - The thoughts/ directory is synced between the main repo and worktrees
   - Always use ONLY the relative path starting with `thoughts/shared/...`
   - Example: `thoughts/shared/plans/2025-12-31-feature-name.md`

4. **Confirm with user:**

   ```
   Based on the input, I plan to create a worktree with the following details:

   worktree path: ~/wt/musiqasik/BRANCH_NAME
   branch name: BRANCH_NAME
   path to plan file: $FILEPATH
   launch prompt:

       /implement_plan at $FILEPATH and when you are done implementing and all tests pass, read ./.opencode/command/commit.md and create a commit, then read ./.opencode/command/describe_pr.md and create a PR

   command to run:

        cd ~/wt/musiqasik/BRANCH_NAME && opencode run -m google/gemini-claude-opus-4-5-thinking-high "/implement_plan at $FILEPATH and when you are done implementing and all tests pass, read ./.opencode/command/commit.md and create a commit, then read ./.opencode/command/describe_pr.md and create a PR"

   Alternative (Interactive TUI):

       opencode ~/wt/musiqasik/BRANCH_NAME
   ```

   Incorporate any user feedback.

5. **Launch implementation session:**
   Execute the command shown above to start the OpenCode session in the worktree.
