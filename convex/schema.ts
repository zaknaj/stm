import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { matchStateValidator } from './gameValidators';

const gameStatusValidator = v.union(v.literal('waiting'), v.literal('active'), v.literal('won'));

export default defineSchema({
	games: defineTable({
		status: gameStatusValidator,
		player1Token: v.string(),
		player2Token: v.optional(v.string()),
		state: matchStateValidator
	})
		.index('by_status', ['status'])
		.index('by_player1Token_and_status', ['player1Token', 'status'])
		.index('by_player2Token_and_status', ['player2Token', 'status'])
});
