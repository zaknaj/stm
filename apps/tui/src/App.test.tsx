import { expect, test } from 'bun:test';
import { TextAttributes } from '@opentui/core';
import { testRender } from '@opentui/react/test-utils';
import { act } from 'react';
import { App } from './App.tsx';

test('renders the demo board with distinct player colors', async () => {
	const setup = await testRender(<App />, { height: 30, width: 80 });

	try {
		await act(async () => {
			await setup.renderOnce();
		});
		const frame = setup.captureCharFrame();
		const lines = frame.split('\n');
		const monarchSpans = setup
			.captureSpans()
			.lines.flatMap((line) => line.spans)
			.filter((span) => span.text.trim() === 'M');

		expect(frame).toContain('    A   B   C   D   E   F   G   H');
		expect(frame).toContain('┌───┬───┬───┬───┬───┬───┬───┬───┐');
		expect(frame).toContain('8 │   │   │   │   │ M │   │ S │   │');
		expect(frame).toContain('├───┼───┼───┼───┼─²─┼───┼─⁴─┼───┤');
		expect(frame).toContain('└───┴─¹─┴───┴─³─┴───┴───┴───┴───┘');
		expect(monarchSpans).toHaveLength(2);
		expect(new Set(monarchSpans.map((span) => span.fg.toString())).size).toBe(2);
		expect(monarchSpans.every((span) => (span.attributes & TextAttributes.UNDERLINE) !== 0)).toBe(true);
		expect(frame).not.toContain('Slay the Monarch');
		expect(lines.find((line) => line.includes('└───┴─¹─'))).toBeDefined();
	} finally {
		await act(async () => {
			setup.renderer.destroy();
		});
	}
});
