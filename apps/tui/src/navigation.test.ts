import { expect, test } from 'bun:test';
import { moveSelection } from './navigation.ts';

test('starts at A1 and wraps horizontally', () => {
	expect(moveSelection(null, 'right')).toEqual({ file: 1, rank: 0 });
	expect(moveSelection({ file: 0, rank: 0 }, 'left')).toEqual({ file: 7, rank: 0 });
	expect(moveSelection({ file: 7, rank: 3 }, 'right')).toEqual({ file: 0, rank: 3 });
});

test('wraps vertically', () => {
	expect(moveSelection({ file: 2, rank: 7 }, 'up')).toEqual({ file: 2, rank: 0 });
	expect(moveSelection({ file: 2, rank: 0 }, 'down')).toEqual({ file: 2, rank: 7 });
});
