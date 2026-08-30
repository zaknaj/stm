import { applyMatchAction, createInitialMatch, type PlayerId } from '../packages/game/src/index';
import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { matchActionValidator } from './gameValidators';

type GameStatus = Doc<'games'>['status'];

function roleForToken(game: Doc<'games'>, playerToken: string): PlayerId | null {
	if (game.player1Token === playerToken) return 'player1';
	if (game.player2Token === playerToken) return 'player2';
	return null;
}

async function findCurrentGame(ctx: MutationCtx, playerToken: string): Promise<Doc<'games'> | null> {
	for (const status of ['active', 'waiting'] as const satisfies readonly GameStatus[]) {
		const asPlayer1 = await ctx.db
			.query('games')
			.withIndex('by_player1Token_and_status', (q) =>
				q.eq('player1Token', playerToken).eq('status', status)
			)
			.unique();
		if (asPlayer1) return asPlayer1;

		const asPlayer2 = await ctx.db
			.query('games')
			.withIndex('by_player2Token_and_status', (q) =>
				q.eq('player2Token', playerToken).eq('status', status)
			)
			.unique();
		if (asPlayer2) return asPlayer2;
	}
	return null;
}

function session(game: Doc<'games'>, playerToken: string) {
	const role = roleForToken(game, playerToken);
	if (!role) throw new Error('This player does not belong to the game.');
	return {
		gameId: game._id,
		role,
		status: game.status,
		state: game.state
	};
}

export const joinOrCreate = mutation({
	args: { playerToken: v.string() },
	handler: async (ctx, args) => {
		const current = await findCurrentGame(ctx, args.playerToken);
		if (current) return session(current, args.playerToken);

		const waitingGames = await ctx.db
			.query('games')
			.withIndex('by_status', (q) => q.eq('status', 'waiting'))
			.order('asc')
			.take(16);
		const waiting = waitingGames.find((game) => game.player1Token !== args.playerToken);
		if (waiting) {
			await ctx.db.patch('games', waiting._id, {
				player2Token: args.playerToken,
				status: 'active'
			});
			return {
				gameId: waiting._id,
				role: 'player2' as const,
				status: 'active' as const,
				state: waiting.state
			};
		}

		const state = createInitialMatch();
		const gameId = await ctx.db.insert('games', {
			status: 'waiting',
			player1Token: args.playerToken,
			state
		});
		return {
			gameId,
			role: 'player1' as const,
			status: 'waiting' as const,
			state
		};
	}
});

export const getSession = query({
	args: {
		gameId: v.id('games'),
		playerToken: v.string()
	},
	handler: async (ctx: QueryCtx, args) => {
		const game = await ctx.db.get('games', args.gameId);
		if (!game) return null;
		return session(game, args.playerToken);
	}
});

export const act = mutation({
	args: {
		gameId: v.id('games'),
		playerToken: v.string(),
		action: matchActionValidator
	},
	handler: async (
		ctx,
		args
	): Promise<{ ok: true; message: string } | { ok: false; error: string }> => {
		const game = await ctx.db.get('games', args.gameId);
		if (!game) return { ok: false, error: 'Game not found.' };
		const role = roleForToken(game, args.playerToken);
		if (!role) return { ok: false, error: 'This player does not belong to the game.' };
		if (game.status !== 'active') return { ok: false, error: 'The game is not active.' };
		if (game.state.activePlayer !== role) return { ok: false, error: 'It is not your turn.' };

		const result = applyMatchAction(game.state, role, args.action);

		if (!result.ok) return result;
		await ctx.db.patch('games', game._id, {
			state: result.state,
			status: result.state.status.kind === 'won' ? 'won' : 'active'
		});
		return {
			ok: true,
			message: result.state.log[result.state.log.length - 1] ?? 'Done.'
		};
	}
});
