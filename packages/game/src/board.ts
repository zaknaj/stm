export const BOARD_SIZE = 8;

export const UNIT_SYMBOLS = {
	monarch: 'M',
	ranger: 'R',
	sorcerer: 'S',
	warrior: 'W'
} as const;

export type UnitKind = keyof typeof UNIT_SYMBOLS;
export type UnitSide = 'allied' | 'enemy';

export type BoardPosition = {
	file: number;
	rank: number;
};

export type BoardUnit = {
	id: string;
	kind: UnitKind;
	displayNumber?: 1 | 2 | 3 | 4 | 5;
	position: BoardPosition;
	side: UnitSide;
};

export function boardPositionKey(position: BoardPosition): string {
	return `${position.file}:${position.rank}`;
}
