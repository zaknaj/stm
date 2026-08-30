# Slay the Monarch: Game-System Architecture

This document describes the architecture of the game system. It complements the game description in [GAME.md](./GAME.md) and the exact match flow in [GAMEPLAY.md](./GAMEPLAY.md). It defines the boundaries through which game content interacts without prescribing particular spells, shapes, filters, effects, or balance values.

## Architectural Principles

- Combat is fully deterministic. The complete match state is sufficient to determine the result of any confirmed action.
- The input phase is read-only. It gathers and validates player choices without changing match state.
- All match-state changes occur through ordered operations resolved by one central resolution process.
- Spells, effects, and reactions use the same operation system rather than changing state through separate mechanisms.
- Content is defined separately from its runtime state. Definitions describe what can exist; runtime instances track what is currently happening in a match.
- Death and victory are checked at deterministic points during resolution. A monarch's death ends the match immediately.

## System Layers

### Content definitions

Content definitions describe reusable game content:

- Unit classes and their available spell pools
- Monarchs and their fixed spell sets
- Spells and their input and execution definitions
- Effects that can exist on units or cells
- Operations that can change match state

Definitions contain no match-specific state. They are used to construct squads and create runtime instances when a match begins.

### Squad configuration

A squad configuration records the units and spells selected by a player. It is responsible for satisfying the squad-building rules described in `GAME.md`, including the gold budget, squad-size limit, spell-copy rules, and required monarch.

The configured squad becomes the source from which the player's runtime units and spell instances are created for a match.

### Runtime match state

The runtime match state is the authoritative description of an active match. It includes:

- The board, its cells, and cell effects
- Both players and their current energy
- Runtime unit instances, including their deployment state, position when deployed, HP, controller, and active effects
- Runtime spell instances and their current cooldowns
- Turn and phase state
- The sequence of state changes being resolved

Because the game has no hidden gameplay information, the same authoritative state can support validation, previews, resolution, and presentation to both players.

## Match Lifecycle

A match moves through these broad phases:

1. Validate and load both squad configurations.
2. Determine Player 1 and Player 2; Player 1 takes the first turn.
3. Begin with an empty board and both squads undeployed.
4. Alternate player turns while units are deployed and spells are cast.
5. Continue until a monarch dies or a player surrenders.

At the start of a player's turn, the player gains energy, their spell cooldowns advance, and start-of-turn effects resolve before the player receives control. During the turn, the player may deploy units and cast spells in any valid order, subject to the mandatory initial deployment of their monarch. The exact energy schedule and interaction sequence are defined in [GAMEPLAY.md](./GAMEPLAY.md).

## Spell Architecture

A spell definition contains:

- Squad-building properties such as its gold cost and class availability
- Its cooldown
- An ordered sequence of inputs
- An ordered execution definition

Energy cost is a shared game rule rather than a variable spell property: every spell costs one energy.

### Input phase

The input phase collects all player decisions before execution. A spell may have no variable choices, one input, or a sequence of dependent inputs. Every input that requires a choice produces exactly one chosen cell.

An input is defined by:

- **Origin:** The caster's cell or a cell chosen by an earlier input
- **Shape:** The spatial pattern in which cells can be considered
- **Range:** A lower and upper bound, with an upper bound that may be unlimited
- **Filters:** Additional rules governing valid choices, including cell eligibility, visibility, relationships to other inputs, and whether range modifiers apply

Later inputs may reference cells chosen by earlier inputs. The input phase does not modify match state. After all required inputs have been collected, the player must confirm the complete spell before execution begins.

### Validation and confirmation

Before confirmation, the system validates the caster, spell availability, energy, cooldown, and every required input against the current match state. The selected inputs are presented for confirmation without applying any consequence.

On confirmation, the spell commits its energy cost and cooldown, then produces its ordered execution operations.

### Execution operations

An operation is the only mechanism that changes match state. Reusable operations cover state changes such as:

- Damaging or healing a unit
- Moving a unit
- Applying or removing an effect
- Summoning a unit
- Creating or removing a cell effect
- Changing player energy or a spell cooldown

Each execution operation defines its own effect zone using one or more chosen input cells. The same input can therefore support several operations with different effect zones. An operation can act on the cells in its zone, their current occupants, or relationships between referenced cells.

Operations belonging to a spell are added to resolution in their written order.

Non-spell gameplay actions that change match state, including deployment, also enter through the same validation, confirmation, and operation-resolution boundary.

## Resolution

The resolver is the sole authority for changing runtime match state. It processes one operation at a time:

1. Read the current state and the operation's referenced cells and units.
2. Apply all relevant modifiers.
3. Apply the resulting state change.
4. Perform immediate state checks, including HP, death, and monarch victory.
5. Emit the events produced by the completed operation.
6. Add any triggered operations to the deterministic resolution sequence.

If a monarch dies during an operation, the match ends immediately and no later operation can change the result.

Operations always read the state produced by earlier operations. An effect zone identifies cells; an operation evaluates those cells and their occupants at the time that operation resolves.

## Effects, Modifiers, and Triggers

Effects can exist on units or cells. They participate in resolution through two distinct mechanisms.

### Modifiers

Modifiers alter a value or rule being evaluated without directly changing match state. Examples include changes to range, damage, healing, or whether a target is valid.

Modifiers are collected and applied by the system responsible for the value or rule being evaluated. Their application must be deterministic.

### Triggers

Triggers react to events emitted by completed operations. A trigger does not directly mutate state; it creates one or more new operations and adds them to the deterministic resolution sequence.

This keeps spell execution, persistent effects, cell reactions, and other chained interactions inside the same resolution model.

## Spatial Queries

Inputs and effect zones share the board's spatial model but serve different purposes:

- An input's shape, range, and filters determine which single cell the player may choose.
- An operation's effect zone determines which cells that operation evaluates during execution.

Spatial queries operate from explicit origins and references. Rules such as visibility, obstruction, traversal, distance, and relationships between inputs belong to this spatial system, allowing spells to reuse consistent board behavior.

## Extensibility

The system is declarative-first: spells should be assembled from reusable inputs, effect zones, operations, modifiers, and triggers. This makes interactions easier to validate, preview, test, and describe consistently.

When a spell concept cannot be expressed cleanly with existing primitives, the system may introduce a new reusable operation or spatial rule. Even specialized behavior must enter through the normal validation and resolution pipeline and must not mutate match state outside the resolver.
