# Slay the Monarch

A playable online, two-player terminal prototype of an 8×8 deterministic strategy game. Each player deploys a Monarch, Ranger, Warrior, and Sorcerer; spends energy on movement and combat spells; and wins by killing the enemy Monarch.

The project is a pnpm workspace with multiple clients sharing one game package and one Convex backend.

```text
apps/tui       OpenTUI terminal client
apps/web       SvelteKit web client
packages/game  Shared deterministic game rules and types
convex         Authoritative backend
```

## Development

Install dependencies:

```sh
pnpm install
```

Start the configured Convex backend during local development:

```sh
pnpm dev:backend
```

Then open the terminal client in two terminals:

```sh
pnpm stm
```

The first client creates a game and waits. The second client automatically joins it; no game code or menu is required.

Use the arrow keys to move the cursor, number keys to select units and spells, Enter to select or confirm, Escape to go back, and E to end the turn.

Start the web client or Convex backend:

```sh
pnpm dev:web
pnpm dev:backend
```

Check, test, and build the complete workspace:

```sh
pnpm check
pnpm test
pnpm build
```

The TUI build produces a standalone executable at `apps/tui/dist/stm`.

## Documentation

- [GAME.md](./GAME.md) describes the game, its objective, squads, and core rules.
- [GAMEPLAY.md](./GAMEPLAY.md) defines the exact sequence and interface of an active match.
- [ARCHITECTURE.md](./ARCHITECTURE.md) describes the underlying game-system architecture.
