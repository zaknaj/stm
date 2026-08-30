import { v } from 'convex/values';

export const playerIdValidator = v.union(v.literal('player1'), v.literal('player2'));

export const boardPositionValidator = v.object({
	file: v.number(),
	rank: v.number()
});

const unitKindValidator = v.union(
	v.literal('monarch'),
	v.literal('ranger'),
	v.literal('warrior'),
	v.literal('sorcerer')
);

const playerStateValidator = v.object({
	id: playerIdValidator,
	name: v.string(),
	energy: v.number(),
	turnsStarted: v.number()
});

const unitStateValidator = v.object({
	id: v.string(),
	controller: playerIdValidator,
	kind: unitKindValidator,
	displayNumber: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
	hp: v.number(),
	position: v.union(boardPositionValidator, v.null()),
	cooldowns: v.record(v.string(), v.number())
});

const matchStatusValidator = v.union(
	v.object({ kind: v.literal('active') }),
	v.object({
		kind: v.literal('won'),
		winner: playerIdValidator,
		reason: v.union(v.literal('monarch'), v.literal('surrender'))
	})
);

export const matchStateValidator = v.object({
	activePlayer: playerIdValidator,
	players: v.object({
		player1: playerStateValidator,
		player2: playerStateValidator
	}),
	units: v.array(unitStateValidator),
	status: matchStatusValidator,
	turnNumber: v.number(),
	log: v.array(v.string())
});

export const matchActionValidator = v.union(
	v.object({
		kind: v.literal('deploy'),
		unitId: v.string(),
		target: boardPositionValidator
	}),
	v.object({
		kind: v.literal('cast'),
		unitId: v.string(),
		spellId: v.string(),
		target: boardPositionValidator
	}),
	v.object({ kind: v.literal('end-turn') }),
	v.object({ kind: v.literal('surrender') })
);
