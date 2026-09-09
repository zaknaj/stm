# Slay the Monarch

A blank web app using Svelte, TypeScript, Vite, Convex, and pnpm.

## Development

```sh
pnpm install
pnpm dev
```

The page is intentionally blank. The Svelte entry point is `src/main.ts`,
and `src/App.svelte` is ready for the web game.

## Backend

Convex is retained with an empty schema and no game functions. Run
`pnpm dev:backend` when ready to sync the backend. Set `VITE_CONVEX_URL`
in `.env.local` when connecting the web app to Convex; the blank app does
not require a backend connection.

## Checks and build

```sh
pnpm check
pnpm build
pnpm preview
```

## Game design

[GAME.md](./GAME.md) contains the game rules and systems.
