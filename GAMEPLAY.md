# Match Gameplay

This document describes the playable terminal version of *Slay the Monarch*. The rules are in [GAME.md](./GAME.md), and the current system structure is in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Match Format

The game is played locally by two players sharing one terminal. Player 1 is always shown below the board and Player 2 above it. The whole board and both squads remain visible during every turn.

Player 1 takes the first turn. The board begins empty, and each player's first action must deploy their monarch.

## Turn Start

At the start of a turn:

1. The active player gains energy.
2. That player's positive spell cooldowns decrease by 1.
3. The active player receives control.

The energy schedule is:

| Turn | Energy gained |
| --- | ---: |
| Player 1's first turn | 1 |
| Player 2's first turn | 2 |
| Player 1's second turn | 2 |
| Player 2's second turn | 3 |
| Every later player turn | 3 |

Unspent energy carries over without a cap.

## Taking Actions

The active player's squad is numbered in this order:

1. Monarch
2. Ranger
3. Warrior
4. Sorcerer

Pressing that number selects the unit. If it is undeployed, its valid deployment cells are highlighted. If it is deployed, its spells are shown and numbered.

Selecting a spell highlights every valid destination or target. The player moves the cursor to a highlighted cell, selects it, and confirms the action. Nothing is spent before confirmation. After deployment or a spell, the same unit remains selected.

An undeployed non-monarch cannot be selected for deployment until that player's monarch is on the board. A unit cannot cast spells until it has been deployed.

## Ending a Turn

The active player may end the turn after deploying their monarch. Ending the turn requires confirmation. The other player then gains their turn-start energy, their cooldowns decrease, and control passes to them.

There is no minimum number of actions and no penalty for conserving energy.

## Controls

| Key | Action |
| --- | --- |
| Arrow keys | Move the board cursor. The cursor wraps at board edges. |
| 1–4 | Select a unit. When a unit is selected, choose one of its spell slots. |
| Enter | Select a cell or confirm an action. |
| Space | Alternate Select/Confirm key. |
| Escape | Cancel the current choice, then return to unit selection. |
| E | End the turn. |
| X | Surrender. |
| Q | Quit the program. |
| R | Start a new match after a win. |

The interface always shows both rosters, current HP, deployment locations, player energy, and the selected unit's spells and cooldowns. Blue dots mark valid cells. The line below the action prompt reports the most recent result or error.

## Resolution and Completion

Confirmed actions resolve immediately and deterministically. Damage cannot reduce HP below 0, and healing cannot raise HP above the unit's maximum.

When a non-monarch dies, it is removed from the board. When a monarch dies, the game ends immediately and announces the winner. Surrender also ends the game immediately.

## Assumptions Used for This Version

The unanswered details needed for a playable version use these rules:

- Deployment is visible and happens during normal turns rather than in a separate placement phase.
- Player 2 receives the larger opening energy grants shown above to offset Player 1 acting first.
- Walking uses orthogonal paths; general ranges and adjacency include diagonals.
- Units block walking paths and Ranger shots, but not Sorcerer Blink.
- The board orientation is fixed instead of rotating for the active player.
