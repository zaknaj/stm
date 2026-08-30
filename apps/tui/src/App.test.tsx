import { expect, test } from 'bun:test';
import { TextAttributes } from '@opentui/core';
import { testRender } from '@opentui/react/test-utils';
import { createInitialMatch } from '@stm/game';
import { act } from 'react';
import { MatchApp } from './App.tsx';
import { Board } from './components/Board.tsx';
import { DEMO_UNITS } from './demoPosition.ts';

const ignoreAction = async () => ({ ok: true as const, message: 'Done.' });

test('renders the demo board with distinct player colors', async () => {
	const setup = await testRender(<Board units={DEMO_UNITS} />, { height: 30, width: 80 });

	try {
		await act(async () => {
			await setup.renderOnce();
		});
		const frame = setup.captureCharFrame();
		const monarchSpans = setup
			.captureSpans()
			.lines.flatMap((line) => line.spans)
			.filter((span) => span.text.trim() === 'M');

		expect(frame).toContain('    A   B   C   D   E   F   G   H');
		expect(frame).toContain('┌───┬───┬───┬───┬─₂─┬───┬─₄─┬───┐');
		expect(frame).toContain('8 │   │   │   │   │ M │   │ S │   │');
		expect(frame).toContain('├───┼───┼─₁─┼───┼───┼─₃─┼───┼───┤');
		expect(frame).toContain('├───┼─₁─┼───┼─₃─┼───┼───┼───┼───┤');
		expect(frame).toContain('└───┴───┴───┴───┴───┴───┴───┴───┘');
		expect(monarchSpans).toHaveLength(2);
		expect(new Set(monarchSpans.map((span) => span.fg.toString())).size).toBe(2);
		expect(monarchSpans.every((span) => (span.attributes & TextAttributes.UNDERLINE) !== 0)).toBe(true);
	} finally {
		await act(async () => {
			setup.renderer.destroy();
		});
	}
});

test('starts a playable match with fixed undeployed squads', async () => {
	const setup = await testRender(
		<MatchApp match={createInitialMatch()} localPlayer="player1" onAction={ignoreAction} />,
		{ height: 30, width: 90 }
	);

	try {
		await act(async () => {
			await setup.renderOnce();
		});
		const frame = setup.captureCharFrame();
		expect(frame).toContain('SLAY THE MONARCH  Turn 1');
		expect(frame).toContain('>P1 E1  1M 8/8@--  2R 4/4@--  3W 7/7@--  4S 5/5@--');
		expect(frame).toContain('P2 E0  1M 8/8@--  2R 4/4@--  3W 7/7@--  4S 5/5@--');
		expect(frame).toContain('Player 1 gains 1 energy.');
	} finally {
		await act(async () => {
			setup.renderer.destroy();
		});
	}
});

test('selects the required Monarch and shows its deployment cells', async () => {
	const setup = await testRender(
		<MatchApp match={createInitialMatch()} localPlayer="player1" onAction={ignoreAction} />,
		{ height: 30, width: 90 }
	);

	try {
		await act(async () => {
			await setup.renderOnce();
			setup.mockInput.pressKey('1');
			await setup.renderOnce();
			await Bun.sleep(20);
		});
		const frame = setup.captureCharFrame();
		expect(frame).toContain('Deploy Monarch.');
		expect(frame).toContain('Choose a highlighted cell.');
		expect(frame).toContain('1 ║ · ║ · │ · │ · │ · │ · │ · │ · │');
	} finally {
		await act(async () => {
			setup.renderer.destroy();
		});
	}
});

test('coordinates the selected file and rank labels with a complete gold border', async () => {
	const selectedPosition = { file: 1, rank: 0 } as const;
	const setup = await testRender(
		<Board
			selectedPosition={selectedPosition}
			units={[
				{
					id: 'selected-sorcerer',
					kind: 'sorcerer',
					displayNumber: 1,
					position: selectedPosition,
					side: 'allied'
				}
			]}
		/>,
		{ height: 30, width: 80 }
	);

	try {
		await act(async () => {
			await setup.renderOnce();
		});

		const frame = setup.captureCharFrame();
		const spans = setup.captureSpans().lines.flatMap((line) => line.spans);
		const coordinatedCharacters = ['B', '1', '╔', '╗', '╚', '╝'];
		const coordinatedSpans = coordinatedCharacters.map((character) =>
			spans.find((span) => span.text.trim() === character || span.text.includes(character))
		);
		const unitSpan = spans.find((span) => span.text.trim() === 'S');
		const unitNumberSpan = spans.find((span) => span.text.trim() === '₁');

		expect(frame).toContain('├───╔═₁═╗───');
		expect(frame).toContain('1 │   ║ S ║');
		expect(frame).toContain('└───╚═══╝───');
		expect(coordinatedSpans.every((span) => span !== undefined)).toBe(true);
		expect(new Set(coordinatedSpans.map((span) => span?.fg.toString())).size).toBe(1);
		expect(unitSpan?.fg.toString()).toBe(unitNumberSpan?.fg.toString());
		expect(unitSpan?.fg.toString()).not.toBe(coordinatedSpans[0]?.fg.toString());
	} finally {
		await act(async () => {
			setup.renderer.destroy();
		});
	}
});

test('copies the entire rendered board with Command-C', async () => {
	const setup = await testRender(
		<MatchApp match={createInitialMatch()} localPlayer="player1" onAction={ignoreAction} />,
		{ height: 30, kittyKeyboard: true, width: 80 }
	);
	let copiedText = '';
	setup.renderer.copyToClipboardOSC52 = (text) => {
		copiedText = text;
		return true;
	};

	try {
		await act(async () => {
			await setup.renderOnce();
			setup.mockInput.pressKey('c', { super: true });
		});

		expect(copiedText.split('\n')).toHaveLength(18);
		expect(copiedText).toStartWith('    A   B   C   D   E   F   G   H\n');
		expect(copiedText).toEndWith('  ╚═══╝───┴───┴───┴───┴───┴───┴───┘');
	} finally {
		await act(async () => {
			setup.renderer.destroy();
		});
	}
});
