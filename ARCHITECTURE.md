# Game-System Architecture

This document describes the system used by the current playable version. It complements [GAME.md](./GAME.md) and [GAMEPLAY.md](./GAMEPLAY.md).

## Principles

- The game is deterministic: the same state and confirmed action always produce the same result.
- Game rules are independent from the terminal interface.
- Browsing and target selection are read-only.
- A confirmed action is validated again before changing the match.
- Rule functions return a new match state instead of altering the previous one.
- Death and victory are checked immediately after damage.

## Content and Match State

Unit definitions hold each unit type's name, maximum HP, and fixed spells. Spell definitions hold their name, cooldown, short description, targeting rule, range, and effect amount.

The match state contains everything required to continue a game:

- The active player and turn number
- Each player's energy and number of turns started
- Every unit's owner, type, HP, deployment position, and cooldowns
- Whether the match is active or won
- A short record of resolved actions

The board does not need separate mutable cells. Occupancy is derived from the living units' positions.

## Action Flow

The terminal interface has four interaction states:

1. **Browse:** Select a squad unit or inspect the focused board cell.
2. **Deploy:** Choose one valid home-row cell for an undeployed unit.
3. **Target:** Choose one valid cell for a selected spell.
4. **Confirm:** Confirm or cancel deployment, spell casting, ending the turn, or surrender.

The rules layer supplies valid deployment cells and valid spell targets without changing the match. On confirmation, it checks the action again against the latest state. A valid action returns the next state; an invalid action returns a short error and leaves the state unchanged.

## Spell Resolution

Each current spell has one cell input and one effect: move, damage, or heal. A confirmed spell resolves in this order:

1. Validate the active player, caster, energy, cooldown, and target.
2. Spend 1 energy.
3. Set the spell's cooldown.
4. Apply movement, damage, or healing.
5. Remove a unit that reached 0 HP.
6. End the match immediately if that unit was a monarch.
7. Record a short result message.

Because each spell currently has one effect, no separate effect queue is needed. The order above is the complete resolution order.

## Spatial Queries

The system uses a few reusable board queries:

- **Walk:** Breadth-first search through empty orthogonally adjacent cells, limited by movement range.
- **Radius:** Chebyshev distance, which treats a diagonal step like an orthogonal step.
- **Clear line:** Horizontal, vertical, or diagonal alignment with no unit between caster and target.
- **Teleport:** Any empty cell in radius, without checking intervening cells.
- **Deployment:** Any empty cell in the active player's nearest two ranks.

These queries produce the highlighted cells shown by the terminal interface and are reused when the confirmed action is validated.

## Turn Transition

Ending a turn changes the active player and increments the turn number. The new active player's scheduled energy is added, then that player's positive cooldowns decrease. The resulting state is handed back to the interface.

## Current Boundary

The playable match runs entirely through the shared deterministic rules package and the local terminal client. Its fixed squads require no squad configuration or external service during play.
