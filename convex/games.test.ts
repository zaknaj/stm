/// <reference types="vite/client" />

import type { MatchAction, MatchState, PlayerId } from '../packages/game/src/index';
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { expect, test } from 'vitest';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

type Session = {
	gameId: Id<'games'>;
	role: PlayerId;
	status: 'waiting' | 'active' | 'won';
	state: MatchState;
};

const joinOrCreate = makeFunctionReference<'mutation', { playerToken: string }, Session>(
	'games:joinOrCreate'
);
const getSession = makeFunctionReference<
	'query',
	{ gameId: Id<'games'>; playerToken: string },
	Session | null
>('games:getSession');
const act = makeFunctionReference<
	'mutation',
	{ gameId: Id<'games'>; playerToken: string; action: MatchAction },
	{ ok: true; message: string } | { ok: false; error: string }
>('games:act');

test('pairs two players into one waiting game', async () => {
	const t = convexTest(schema, modules);
	const first = await t.mutation(joinOrCreate, { playerToken: 'first' });
	expect(first.role).toBe('player1');
	expect(first.status).toBe('waiting');

	const firstAgain = await t.mutation(joinOrCreate, { playerToken: 'first' });
	expect(firstAgain.gameId).toBe(first.gameId);

	const second = await t.mutation(joinOrCreate, { playerToken: 'second' });
	expect(second.gameId).toBe(first.gameId);
	expect(second.role).toBe('player2');
	expect(second.status).toBe('active');

	const updatedFirst = await t.query(getSession, {
		gameId: first.gameId,
		playerToken: 'first'
	});
	expect(updatedFirst?.status).toBe('active');
});

test('accepts actions only from the active player and shares the resulting state', async () => {
	const t = convexTest(schema, modules);
	const first = await t.mutation(joinOrCreate, { playerToken: 'first' });
	await t.mutation(joinOrCreate, { playerToken: 'second' });

	const wrongTurn = await t.mutation(act, {
		gameId: first.gameId,
		playerToken: 'second',
		action: { kind: 'deploy', unitId: 'player2-monarch', target: { file: 0, rank: 7 } }
	});
	expect(wrongTurn).toEqual({ ok: false, error: 'It is not your turn.' });

	const deployed = await t.mutation(act, {
		gameId: first.gameId,
		playerToken: 'first',
		action: { kind: 'deploy', unitId: 'player1-monarch', target: { file: 0, rank: 0 } }
	});
	expect(deployed).toMatchObject({ ok: true, message: 'Player 1 deploys Monarch on A1.' });

	const secondView = await t.query(getSession, {
		gameId: first.gameId,
		playerToken: 'second'
	});
	expect(secondView?.state.units.find((unit) => unit.id === 'player1-monarch')?.position).toEqual({
		file: 0,
		rank: 0
	});

	const ended = await t.mutation(act, {
		gameId: first.gameId,
		playerToken: 'first',
		action: { kind: 'end-turn' }
	});
	expect(ended).toMatchObject({ ok: true, message: 'Player 2 gains 2 energy.' });

	const player2Turn = await t.query(getSession, {
		gameId: first.gameId,
		playerToken: 'second'
	});
	expect(player2Turn?.state.activePlayer).toBe('player2');
	expect(player2Turn?.state.players.player2.energy).toBe(2);
});
