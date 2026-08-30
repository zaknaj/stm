import { expect, test } from 'bun:test';
import { TextAttributes } from '@opentui/core';
import { testRender } from '@opentui/react/test-utils';
import { act } from 'react';
import { App } from './App.tsx';
import { Board } from './components/Board.tsx';

test('renders the demo board with distinct player colors', async () => {
	const setup = await testRender(<App />, { height: 30, width: 80 });

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
		expect(frame).not.toContain('Slay the Monarch');
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
	const setup = await testRender(<App />, { height: 30, kittyKeyboard: true, width: 80 });
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
		expect(copiedText).toEndWith('  └───┴───┴───┴───┴───┴───┴───┴───┘');
	} finally {
		await act(async () => {
			setup.renderer.destroy();
		});
	}
});
