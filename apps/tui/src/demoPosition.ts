import type { BoardUnit } from '@stm/game';

export const DEMO_UNITS: readonly BoardUnit[] = [
	{ id: 'enemy-ranger', kind: 'ranger', displayNumber: 1, position: { file: 2, rank: 6 }, side: 'enemy' },
	{ id: 'enemy-monarch', kind: 'monarch', displayNumber: 2, position: { file: 4, rank: 7 }, side: 'enemy' },
	{ id: 'enemy-warrior', kind: 'warrior', displayNumber: 3, position: { file: 5, rank: 6 }, side: 'enemy' },
	{ id: 'enemy-sorcerer', kind: 'sorcerer', displayNumber: 4, position: { file: 6, rank: 7 }, side: 'enemy' },
	{ id: 'allied-sorcerer', kind: 'sorcerer', displayNumber: 1, position: { file: 1, rank: 0 }, side: 'allied' },
	{ id: 'allied-warrior', kind: 'warrior', displayNumber: 2, position: { file: 2, rank: 1 }, side: 'allied' },
	{ id: 'allied-monarch', kind: 'monarch', displayNumber: 3, position: { file: 3, rank: 0 }, side: 'allied' },
	{ id: 'allied-ranger', kind: 'ranger', displayNumber: 4, position: { file: 5, rank: 1 }, side: 'allied' }
];
