# Game Rules and Systems

## Overview

The game is a competitive 1v1 turn-based tactics game played on a 7×7 square grid.

Each player builds a squad before the match using a fixed budget. Units and Monarchs have different squad costs. Squad size is flexible, and duplicate classes are allowed.

The goal is to kill the opposing Monarch.

The game has no randomness and no hidden information.

## Squad and Deployment

Each squad contains:

* One Monarch.
* Any number of other units within the squad budget.
* A fixed starting deployment.

Players place their units within the two rows closest to their side.

The board starts empty except for the players' units.

Both players can see the complete starting board before the match begins.

The first player is chosen randomly.

## Turns

Players alternate full turns.

During a turn:

* Units can act in any order.
* A unit can act multiple times if its spells allow it.
* The player can end the turn at any time.
* The opponent cannot act or react during the turn.

## Spells

Everything a unit can do is represented as a spell, including movement.

Spells can:

* Move units.
* Deal damage or heal.
* Apply or remove effects.
* Affect board cells.
* Summon entities.
* Modify other game properties.

Spells can use range, line of sight, targeting rules, and cooldowns.

Active spells normally cost 1 energy.

Passive spells do not require activation or energy.

## Monarch Customization

Monarchs have class-specific spells and additional slots for **common spells**.

Common spells are selected from a shared pool during squad creation.

They can be active or passive.

Common spells also use the squad budget.

## Energy

Energy is shared by the entire squad.

Each player receives a fixed amount of energy each turn.

Unused energy carries over between turns.

There is no energy storage limit.

## Units

Units can have:

* HP.
* Shields.
* Active spells.
* Passive spells.
* Buffs, debuffs, and other effects.

Only one unit can occupy a cell.

A unit is removed when its HP reaches zero.

If the Monarch dies, the match ends immediately.

## Effects

Effects are a core game system.

Effects can exist on units or board cells and can persist across turns.

They can modify units, spells, movement, energy, cooldowns, or other game properties.

Effects can trigger at defined moments such as the start or end of a turn.

Effects generally stack by duration rather than strength.

## Summons

Spells can summon entities onto the board.

Summons can behave like normal units or static objects.

They can have HP, active spells, passive spells, or no abilities.

## Information and Determinism

All game information is visible to both players.

Players can inspect units, spells, cooldowns, effects, HP, shields, energy, and board state.

There are no random outcomes or hidden information.

Every action has a deterministic result.

## Core Strategy

The game is built around:

* Squad construction.
* Starting deployment.
* Board positioning.
* Energy management.
* Cooldown management.
* Spell sequencing.
* Unit synergy.
* Predicting the opponent.
* Creating opportunities to kill the enemy Monarch.
