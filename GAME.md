# Slay the Monarch

The current terminal playtest is online multiplayer. Two players connect through the shared Convex deployment and take alternating turns.

## Overview

*Slay the Monarch* is a deterministic, turn-based strategy game for two players on an 8×8 board. Each player commands four units. The goal is to kill the enemy monarch.

The game uses small numbers, short spell descriptions, and simple rules whose combinations create the strategy. It is inspired by *Into the Breach*, *Slay the Spire*, *The Battle of Polytopia*, and chess-like positional play.

## Winning

A player wins immediately when the enemy monarch reaches 0 HP. Operations resolve in order, and the first monarch to die ends the match.

A player may also surrender. There are no draws, stalemates, turn limits, or timers.

## Board and Units

Each cell can hold at most one unit. A unit at 0 HP dies and is removed from the board.

Each player has the same fixed squad:

| Unit | HP | Spells |
| --- | ---: | --- |
| Monarch | 8 | Step, Strike |
| Ranger | 4 | Stride, Shot |
| Warrior | 7 | Step, Slash |
| Sorcerer | 5 | Blink, Bolt, Mend |

There is currently no squad building. All units and spells are predefined.

## Deployment

The board starts empty. Units are deployed during normal turns, one at a time. Deployment costs 1 energy and places the unit on an empty cell in its player's nearest two rows.

Each player's first action must deploy their monarch. They cannot take another action or end their turn until they do. A newly deployed unit may act immediately.

## Turns and Energy

Players alternate turns. Player 1 starts with 1 energy, gains 2 on their second turn, and gains 3 on every later turn. Player 2 starts with 2 energy and gains 3 on every later turn. Unspent energy carries over without a cap.

Energy belongs to the player and is shared by their squad. Deployment and every spell cost 1 energy. Movement is performed by spells and also costs 1 energy.

During a turn, the player may use their units in any order. A unit may act more than once if the player has enough energy and its chosen spell is ready. The player decides when to end the turn.

## Spells and Cooldowns

All spells begin ready. After a spell is cast, its cooldown is set to the listed value. At the start of the owning player's turns, each positive cooldown decreases by 1.

- **CD 0:** Can be used repeatedly, including in the same turn.
- **CD 1:** Becomes ready on the unit's next turn.
- **CD 2 or more:** Remains unavailable for additional turns.

Every spell selects one destination or target cell and resolves one effect:

| Unit | Spell | CD | Effect |
| --- | --- | ---: | --- |
| Monarch | Step | 0 | Move 1 cell. |
| Monarch | Strike | 1 | Deal 2 damage to an adjacent enemy. |
| Ranger | Stride | 1 | Move up to 2 cells. |
| Ranger | Shot | 0 | Deal 2 damage to an enemy up to 4 cells away in a clear straight or diagonal line. |
| Warrior | Step | 0 | Move 1 cell. |
| Warrior | Slash | 1 | Deal 3 damage to an adjacent enemy. |
| Sorcerer | Blink | 2 | Teleport to an empty cell up to 2 cells away. |
| Sorcerer | Bolt | 1 | Deal 2 damage to an enemy within 2 cells. |
| Sorcerer | Mend | 3 | Restore up to 2 HP to a damaged ally within 2 cells, including the caster. |

## Spatial Rules

Step and Stride use orthogonal movement. They cannot move through occupied cells, and their destination must be empty.

Adjacency and “within” ranges use the larger of the horizontal and vertical distances, so diagonal cells count at the same distance as orthogonal cells.

Blink ignores cells between its origin and destination. Shot travels horizontally, vertically, or diagonally, and any intervening unit blocks it.

## Information and Commitment

The complete game state is visible and combat has no randomness. Both players can see unit positions, HP, energy, and cooldowns.

Choosing cells and browsing units does not change the match. Deployment and spells take effect when Enter is pressed on a valid cell; ending the turn takes effect immediately, while surrender requires confirmation.
