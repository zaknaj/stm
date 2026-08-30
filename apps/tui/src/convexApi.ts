import type { MatchAction, MatchState, PlayerId } from '@stm/game';
import { makeFunctionReference } from 'convex/server';
import type { Id } from '../../../convex/_generated/dataModel';

export type Session = {
	gameId: Id<'games'>;
	role: PlayerId;
	status: 'waiting' | 'active' | 'won';
	state: MatchState;
};

export const joinOrCreateGame = makeFunctionReference<
	'mutation',
	{ playerToken: string },
	Session
>('games:joinOrCreate');

export const getGameSession = makeFunctionReference<
	'query',
	{ gameId: Id<'games'>; playerToken: string },
	Session | null
>('games:getSession');

export const submitGameAction = makeFunctionReference<
	'mutation',
	{ gameId: Id<'games'>; playerToken: string; action: MatchAction },
	{ ok: true; message: string } | { ok: false; error: string }
>('games:act');
