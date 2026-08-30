# Match Gameplay

## Scope

This document describes what happens inside a match of *Slay the Monarch*: the sequence of play, the actions available to players, and the match interface through which those actions are taken.

The broader game description and squad rules are defined in [GAME.md](./GAME.md). The underlying system design is defined in [ARCHITECTURE.md](./ARCHITECTURE.md). This document is authoritative when either document refers to the exact sequence or interface of an active match.

## Match Start

Before play begins, the game determines which participant is Player 1 and which is Player 2. Player 1 takes the first turn.

The board begins empty. Each player's first gameplay action must be placing their monarch. Until a player places their monarch, they cannot perform another gameplay action or end their turn.

## Turns and Energy

Players alternate turns. At the start of a turn, the following steps occur in order:

1. The active player gains energy.
2. The active player's spell cooldowns advance.
3. Start-of-turn effects resolve.
4. The active player receives control.

If a monarch dies while start-of-turn effects are resolving, the match ends immediately without giving the active player control.

The opening energy schedule is:

| Turn | Energy gained |
| --- | ---: |
| Player 1's first turn | 1 |
| Player 2's first turn | 2 |
| Player 1's second turn | 2 |
| Player 2's second turn | 3 |
| Every subsequent player turn | 3 |

Unspent energy is conserved between turns and there is no energy cap.

Every energy-consuming gameplay action costs one energy. This includes deploying a unit and casting a spell. Interface actions do not cost energy.

Turns end only when the active player chooses and confirms **End Turn**. There is no turn timer. A player may end their turn with unspent energy, except before their mandatory monarch placement.

After **End Turn** is confirmed, the interface returns to Game View before the next player's turn begins.

## Deployment

All units begin undeployed. A player may spend one energy to deploy any of their undeployed units during their turn.

A unit can be deployed onto any empty cell within the two rows closest to its player's side of the board. Deployment is available whenever the player has an undeployed unit, enough energy, and an empty valid deployment cell.

A newly deployed unit may act immediately.

Selecting an undeployed unit opens Cell/Unit View and highlights the cells on which that unit can be deployed. The player selects a destination and then either confirms or cancels. Energy is spent only on confirmation.

## Information and Inspection

The match has perfect information. Both players can inspect both squads, including deployed and undeployed units, spells, HP, energy, cooldowns, and active effects.

The inactive player may inspect cells, units, spells, effects, and the match log while waiting for their turn. They cannot perform gameplay actions.

## Views

The match interface is composed of the player lines, the board, the Message Box, and the Text Area.

### Player Lines and Board

The enemy player's line appears above the board and the local player's line appears below it. Each line shows that player's name or handle and current energy. The active player's line is visually highlighted.

The board is presented between the two player lines from the local player's point of view.

### Message Box

The Message Box appears below the local player's line. It communicates what the player should do next and reports issues that prevent or invalidate an attempted interaction. For example, while deploying it can prompt the player to select a valid cell.

When an action needs confirmation, the Message Box presents a title describing the pending action, such as **Place Monarch in B4?** or **Surrender game?**, together with **Confirm** and **Cancel** actions.

Confirmation identifies the pending action and its selected inputs but does not preview calculated outcomes such as resulting HP, damage, movement, deaths, or applied effects.

### Text Area

The Text Area presents the remaining contextual text and the actions currently available to the player.

### Game View

Game View is the root match view. It presents both players' deployed and undeployed units and the board. It also provides match-level and interface actions, including **End Turn**, surrender, the match log, and settings where applicable.

From Game View, a player can select a board cell, select an undeployed unit to begin deployment, or select an available match-level or interface action.

### Cell/Unit View

Selecting a board cell opens Cell/Unit View. This view presents:

- The selected cell and any effects on it.
- The cell's occupant, if any, including its stats and effects.
- The occupant's spells.
- Actions available from the selected cell or unit.

Because a cell can contain at most one unit, the view has at most one occupant to present. An empty cell may simply be identified as empty; it does not require additional content.

Effects display their remaining duration as a stack. The effect's name and a description of what it does are shown beneath it, in the style of effect descriptions in *Slay the Spire*.

All of a unit's spells are shown. Spells that can currently be played are highlighted; other spells remain visible for inspection.

**End Turn** is available from Cell/Unit View as well as Game View.

### Spell View

Selecting a spell opens Spell View. It shows the selected spell, its description, cost, and other relevant information. Its valid range is highlighted on the board relative to the unit casting it.

If the spell requires inputs, the player selects them in sequence. After all inputs have been selected, the player reaches a final confirmation step.

Confirming executes the spell, spends its energy, and applies its cooldown. Cancelling does not spend resources. After the spell resolves, the interface remains in Cell/Unit View focused on the selected cell.

## Navigation and Commitment

Gameplay interactions form a nested sequence of views and choices. At every step, the player can cancel or escape to return to the previous step, continuing backward until they reach Game View.

Every consequential action ends with an explicit choice to confirm or cancel. This includes energy-consuming actions such as deployment and spell casting, as well as free actions such as **End Turn** and surrender. Ordinary interface navigation, such as opening the match log or settings, does not require confirmation.

No energy, cooldown, unit, turn transition, surrender, or other consequence is committed before confirmation.

## Keyboard Interaction

The entire match interface must be operable with the keyboard. Every available action is displayed with its keyboard shortcut preceding its label.

Arrow keys are reserved for navigating the board and selecting cells. Other actions use non-arrow keyboard shortcuts so that operating the interface does not interfere with board navigation.

**Enter** is the universal Select/Confirm key. Its behavior follows the current interaction step: while navigating or targeting, it selects the focused cell; when a confirmation prompt is shown, it confirms the pending action.

**Escape** is the universal Cancel/Back key. It cancels the current choice or returns to the previous interaction step until the player reaches Game View.

## Match Duration and Completion

There is no turn limit, automatic stalemate, or automatic draw. A match that is not surrendered continues indefinitely until a monarch dies.

When a monarch dies, the opposing player wins immediately, as defined in [GAME.md](./GAME.md).
