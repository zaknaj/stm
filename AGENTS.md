<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Prototype mode

Keep this project deliberately lean for a single-player MVP:

- Implement only the current requested behavior.
- Do not add tests, regression coverage, compatibility layers, migrations, feature flags, or abstractions for hypothetical future needs unless explicitly requested.
- Prefer direct code and deletion over extensibility.
- Remove code that becomes unused during a change.
- Preserve the shelved multiplayer implementation unless explicitly asked to remove it.
