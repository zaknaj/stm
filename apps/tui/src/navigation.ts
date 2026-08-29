import { BOARD_SIZE, type BoardPosition } from '@stm/game';

export type NavigationDirection = 'down' | 'left' | 'right' | 'up';

const ORIGIN: BoardPosition = { file: 0, rank: 0 };

function wrap(value: number): number {
	return (value + BOARD_SIZE) % BOARD_SIZE;
}

/** Move one square, wrapping around either edge. A first move starts at A1. */
export function moveSelection(
	position: BoardPosition | null,
	direction: NavigationDirection
): BoardPosition {
	const current = position ?? ORIGIN;

	switch (direction) {
		case 'left':
			return { file: wrap(current.file - 1), rank: current.rank };
		case 'right':
			return { file: wrap(current.file + 1), rank: current.rank };
		case 'up':
			return { file: current.file, rank: wrap(current.rank + 1) };
		case 'down':
			return { file: current.file, rank: wrap(current.rank - 1) };
	}
}
