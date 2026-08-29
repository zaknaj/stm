# Slay the Monarch

The project is a pnpm workspace with multiple clients sharing one game package
and one Convex backend.

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

Open the terminal client:

```sh
pnpm stm
```

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
