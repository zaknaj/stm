# Slay the Monarch

## Overview

*Slay the Monarch* is a turn-based, one-versus-one strategy game played on an 8×8 board. Each player controls a squad of units led by a monarch. The objective is to kill the opposing monarch.

The game combines positional play with customizable units and spell-based actions. Combat is fully deterministic, with no hidden gameplay information: squad composition, spell loadouts, HP, energy, cooldowns, and active effects are visible to both players. The game is designed around small numbers and concise effects: the basic rules should be easy to understand, while squad building and interactions between spells, units, and the board create strategic depth and room for mastery.

The game draws inspiration from *Into the Breach*, *Slay the Spire*, *The Battle of Polytopia*, and chess-like positional strategy.

## Winning the Game

Each squad must contain exactly one monarch. A player wins immediately when the opposing monarch dies.

Actions and effects resolve in order. If a monarch dies during a resolution, the game ends immediately, so both monarchs cannot die simultaneously.

## Board and Units

The game is played on an 8×8 grid. Each cell can contain no more than one unit, and units cannot move through one another.

A unit is any controllable game piece on the board that can move and perform actions. Units have health points (HP) and die when their HP reaches zero. Summoned pieces are also units.

The board and its cells can carry effects, including features such as zones and portals. Damage and other outcomes can be influenced by effects on the caster, the target, and the cells involved.

## Squads

Before entering a match, each player creates and manages squads. Both players build their squads using the same fixed gold budget.

Units and spells cost gold. A squad may contain up to 16 units, although the gold budget will usually result in squads of roughly three to six units. Unit classes and individual unit choices may be duplicated within a squad.

Every squad must include a monarch, whose cost comes from the same gold budget as the rest of the squad.

### Classes and spells

A class is a type of unit with its own pool of available spells. Purchasing a unit does not include any spells; spells are selected and purchased separately from that class's spell pool. A unit may be included in a squad without any selected spells. There is no fixed limit on the number of spells a unit can equip, but every selected spell counts against the squad's gold budget.

Movement is not an innate action. Each class offers its own purchasable movement spell as part of its spell pool, and classes can have different movement capabilities. For example, a mobile class may be able to move two cells where a less mobile class's equivalently priced movement spell moves only one. A unit without a movement spell cannot move itself, although other spells and effects can still move it.

A unit's selected spells belong to that individual unit. Multiple units of the same class may equip the same spell, but an individual unit cannot equip more than one copy of a spell.

Monarchs do not have classes and cannot be customized. Each monarch is a distinct character with fixed HP and a fixed set of spells. A monarch's gold cost includes the entire unit and all of its spells.

## Match Setup

A match begins with a placement phase. Each player places the units in their squad within the two rows closest to their side of the board.

## Turns and Energy

Players take turns. Each player begins the match with zero energy and gains a fixed amount of energy at the start of each of their turns, including their first turn. Unspent energy carries over between turns and can be accumulated.

Energy belongs to the player and is shared by their entire squad. It represents how many actions the player can take. Every action is performed through a spell, and every spell costs one energy. Movement is also a spell and therefore costs one energy.

During their turn, a player may act with any of their units in any order. The same unit may perform multiple actions, limited only by the player's available energy and the cooldowns of that unit's spells. A player may end their turn whenever they choose.

## Spells and Cooldowns

Spells produce the game's actions and effects. They can affect units or cells, deal damage, move units, create persistent board effects, or summon other units.

Casting a spell has an input phase followed by an execution phase. During the input phase, the player makes every decision required by the spell before any of its effects occur. A spell may require a single choice or a sequence of choices, and each later choice may depend on the choices made before it.

Every input asks the player to choose exactly one cell. Its shape defines the area in which that choice can be made, relative to an origin. One or more filters determine which cells in that shape are valid choices. Filters can consider properties such as occupancy, allegiance, visibility, unit or cell state, relationships to earlier inputs, and whether the input's range can be modified by game effects.

An input's origin may be the caster or a cell chosen by an earlier input, allowing one selection to determine the valid choices offered by the next.

An input's range has a lower and an upper bound. Its upper bound may be unlimited, and its shape determines how that range is measured across the board. Unless the input has a filter that makes its range modifiable, its range remains fixed.

After all required inputs have been collected, the player must confirm the spell. Only then does the spell enter its execution phase and resolve using those choices. Spells that require no variable target choices, including spells that target only their caster, still require confirmation before execution.

Execution consists of one or more ordered operations. Each operation defines its own effect zone using the spell's chosen cells. An effect zone may consist of one chosen cell or may form an area, line, path, or other shape derived from one or more inputs. Different operations may derive different effect zones from the same input. The operation then affects the cells in its zone, their occupants, or relationships between referenced cells.

All spells begin the match ready to use. Each spell has a cooldown that limits how often it can be used. Cooldowns advance at the beginning of the owning player's turn:

- A cooldown of 0 allows a spell to be replayed during the same turn, provided the player has enough energy.
- A cooldown of 1 allows a spell to be used again on the unit's next turn.
- Longer cooldowns keep a spell unavailable for the corresponding number of turns.
- An infinite cooldown makes a spell usable only once per match.

Spell behavior—including movement, targeting, range, damage, effects, and summoning—is defined by each individual spell.
