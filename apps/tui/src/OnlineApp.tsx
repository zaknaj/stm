import { useKeyboard, useRenderer } from '@opentui/react';
import { ConvexClient } from 'convex/browser';
import type { Id } from '../../../convex/_generated/dataModel';
import { useEffect, useMemo, useState } from 'react';
import type { MatchAction } from '@stm/game';
import { MatchApp } from './App.tsx';
import {
	getGameSession,
	joinOrCreateGame,
	submitGameAction,
	type Session
} from './convexApi.ts';

type Identity = {
	gameId: Id<'games'>;
	playerToken: string;
};

type OnlineAppProps = {
	convexUrl?: string;
};

export function OnlineApp({ convexUrl }: OnlineAppProps) {
	const renderer = useRenderer();
	const client = useMemo(() => (convexUrl ? new ConvexClient(convexUrl) : null), [convexUrl]);
	const [attempt, setAttempt] = useState(0);
	const [identity, setIdentity] = useState<Identity | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [error, setError] = useState<string | null>(
		convexUrl ? null : 'Missing PUBLIC_CONVEX_URL. Start the configured Convex backend first.'
	);

	useKeyboard((key) => {
		if (key.name === 'q') renderer.destroy();
	});

	useEffect(() => {
		return () => {
			if (client) void client.close();
		};
	}, [client]);

	useEffect(() => {
		if (!client) return;
		let stopped = false;
		let unsubscribe: (() => void) | undefined;
		const playerToken = crypto.randomUUID();

		setIdentity(null);
		setSession(null);
		setError(null);

		void client
			.mutation(joinOrCreateGame, { playerToken })
			.then((joined) => {
				if (stopped) return;
				const nextIdentity = { gameId: joined.gameId, playerToken };
				setIdentity(nextIdentity);
				setSession(joined);
				unsubscribe = client.onUpdate(
					getGameSession,
					nextIdentity,
					(updated) => {
						if (!stopped && updated) setSession(updated);
					},
					(updateError) => {
						if (!stopped) setError(updateError.message);
					}
				);
			})
			.catch((joinError: unknown) => {
				if (!stopped) {
					setError(joinError instanceof Error ? joinError.message : 'Could not reach Convex.');
				}
			});

		return () => {
			stopped = true;
			unsubscribe?.();
		};
	}, [attempt, client]);

	async function sendAction(action: MatchAction) {
		if (!client || !identity) return { ok: false as const, error: 'Not connected to a game.' };
		return await client.mutation(submitGameAction, { ...identity, action });
	}

	if (error) {
		return (
			<box style={{ alignItems: 'center', flexDirection: 'column', height: '100%', width: '100%' }}>
				<text>SLAY THE MONARCH</text>
				<text>Connection error: {error}</text>
				<text>[Q] quit</text>
			</box>
		);
	}

	if (!session) {
		return (
			<box style={{ alignItems: 'center', flexDirection: 'column', height: '100%', width: '100%' }}>
				<text>SLAY THE MONARCH</text>
				<text>Finding a game...</text>
				<text>[Q] quit</text>
			</box>
		);
	}

	if (session.status === 'waiting') {
		return (
			<box style={{ alignItems: 'center', flexDirection: 'column', height: '100%', width: '100%' }}>
				<text>SLAY THE MONARCH</text>
				<text>Waiting for Player 2...</text>
				<text>[Q] quit</text>
			</box>
		);
	}

	return (
		<MatchApp
			match={session.state}
			localPlayer={session.role}
			onAction={sendAction}
			onRestart={() => setAttempt((value) => value + 1)}
		/>
	);
}
