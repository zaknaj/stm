# Slay the Monarch

A playable online two-player terminal prototype of an 8×8 deterministic strategy game. Each player deploys a Monarch, Ranger, Warrior, and Sorcerer; spends energy on movement and combat spells; and wins by killing the enemy Monarch.

The terminal client connects to a deployed Convex backend for automatic matchmaking, authoritative game state, and live synchronization.

```text
apps/tui       OpenTUI terminal client
packages/game  Shared deterministic game rules and types
convex         Multiplayer backend
```

## Install on macOS

Each GitHub release includes Apple Silicon and Intel builds. After the public repository is configured, install the latest release with:

```sh
curl -fsSL https://github.com/zaknaj/stm/releases/latest/download/install.sh | sh
```

Run the installed game with `~/.local/bin/stm`. The first player waits automatically and the second player joins the oldest waiting game.

The client keeps a private device identity at `~/.config/stm/player-token`. Closing and reopening the app resumes the same waiting or active game.

## Development

Install dependencies:

```sh
pnpm install
```

Start the configured Convex development backend once to push backend changes:

```sh
pnpm dev:backend
```

Then start one terminal client per player:

```sh
pnpm stm
```

The home view hides the cursor and shows deployment actions, dimming the ones that are currently unavailable. Press an arrow key to resume cell selection at the saved cursor position. Empty cells in selection mode keep the deployment actions visible. Use class shortcuts to deploy units (`m` for Monarch, or a class letter plus a number when there are multiple units), number keys to choose spells, and Enter to execute a valid cell action immediately. Selecting a unit shows its spells in a detail box; available spell shortcuts are gold and bold, while cooldown or energy-blocked spells remain visible but dimmed. A ready spell with no current target remains available and shows its range, but cannot be completed until a valid target exists. Escape returns cell selection to home; from home it opens a surrender confirmation. `T` ends the turn immediately; `X` is an alternate surrender shortcut from home.

## Release

Create and publish both macOS archives locally with:

```sh
pnpm build:release
```

The GitHub workflow publishes those archives, checksums, and the installer whenever a `v*` tag is pushed.

## Documentation

- [GAME.md](./GAME.md) describes the game, its objective, squads, and core rules.
