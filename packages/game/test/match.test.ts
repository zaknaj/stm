import { describe, expect, test } from 'bun:test';
import {
	UNIT_DEFINITIONS,
	castSpell,
	createInitialMatch,
	deployUnit,
	endTurn,
	getUnit,
	getValidSpellTargets
} from '../src/index.ts';

describe('fixed match setup', () => {
	test('creates four predefined units per player and starts player 1 with one energy', () => {
		const state = createInitialMatch();
		expect(state.units).toHaveLength(8);
		expect(state.units.every((unit) => unit.position === null)).toBe(true);
		expect(state.players.player1.energy).toBe(1);
		expect(state.players.player2.energy).toBe(0);
		expect(UNIT_DEFINITIONS.sorcerer.spells.map((spell) => spell.cooldown)).toEqual([2, 1, 3]);
	});

	test('requires the monarch first and follows the opening energy schedule', () => {
		let state = createInitialMatch();
		expect(deployUnit(state, 'player1-ranger', { file: 0, rank: 0 }).ok).toBe(false);
		const deployed = deployUnit(state, 'player1-monarch', { file: 3, rank: 0 });
		expect(deployed.ok).toBe(true);
		if (!deployed.ok) return;
		state = deployed.state;
		expect(state.players.player1.energy).toBe(0);

		const ended = endTurn(state);
		expect(ended.ok).toBe(true);
		if (!ended.ok) return;
		state = ended.state;
		expect(state.activePlayer).toBe('player2');
		expect(state.players.player2.energy).toBe(2);
	});
});

describe('spells', () => {
	test('walk movement cannot pass through occupied cells', () => {
		const state = createInitialMatch();
		const ranger = getUnit(state, 'player1-ranger')!;
		ranger.position = { file: 0, rank: 0 };
		getUnit(state, 'player1-monarch')!.position = { file: 1, rank: 0 };
		getUnit(state, 'player1-warrior')!.position = { file: 0, rank: 1 };
		state.players.player1.energy = 5;

		const targets = getValidSpellTargets(state, ranger.id, 'stride');
		expect(targets).not.toContainEqual({ file: 2, rank: 0 });
		expect(targets).not.toContainEqual({ file: 0, rank: 2 });
	});

	test('resolves damage, cooldowns, and monarch victory deterministically', () => {
		let state = createInitialMatch();
		const warrior = getUnit(state, 'player1-warrior')!;
		const monarch = getUnit(state, 'player2-monarch')!;
		warrior.position = { file: 3, rank: 3 };
		monarch.position = { file: 4, rank: 4 };
		monarch.hp = 3;
		state.players.player1.energy = 2;

		const result = castSpell(state, warrior.id, 'slash', monarch.position);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		state = result.state;
		expect(getUnit(state, warrior.id)?.cooldowns.slash).toBe(1);
		expect(state.status).toEqual({ kind: 'won', winner: 'player1', reason: 'monarch' });
		expect(getUnit(state, monarch.id)?.hp).toBe(0);
	});

	test('ticks a cooldown only when its owner starts a turn', () => {
		let state = createInitialMatch();
		const warrior = getUnit(state, 'player1-warrior')!;
		const target = getUnit(state, 'player2-ranger')!;
		warrior.position = { file: 3, rank: 3 };
		target.position = { file: 4, rank: 4 };
		getUnit(state, 'player1-monarch')!.position = { file: 0, rank: 0 };
		getUnit(state, 'player2-monarch')!.position = { file: 7, rank: 7 };
		state.players.player1.energy = 3;

		const cast = castSpell(state, warrior.id, 'slash', target.position);
		expect(cast.ok).toBe(true);
		if (!cast.ok) return;
		expect(getUnit(state, warrior.id)?.cooldowns.slash).toBe(0);
		expect(getUnit(cast.state, warrior.id)?.cooldowns.slash).toBe(1);

		const player2Turn = endTurn(cast.state);
		expect(player2Turn.ok).toBe(true);
		if (!player2Turn.ok) return;
		expect(getUnit(player2Turn.state, warrior.id)?.cooldowns.slash).toBe(1);

		const player1Turn = endTurn(player2Turn.state);
		expect(player1Turn.ok).toBe(true);
		if (!player1Turn.ok) return;
		expect(getUnit(player1Turn.state, warrior.id)?.cooldowns.slash).toBe(0);
	});

	test('blocks a Ranger shot with an intervening unit', () => {
		const state = createInitialMatch();
		const ranger = getUnit(state, 'player1-ranger')!;
		const blocker = getUnit(state, 'player1-warrior')!;
		const target = getUnit(state, 'player2-monarch')!;
		ranger.position = { file: 0, rank: 0 };
		blocker.position = { file: 1, rank: 1 };
		target.position = { file: 3, rank: 3 };
		state.players.player1.energy = 2;

		expect(getValidSpellTargets(state, ranger.id, 'shot')).not.toContainEqual(target.position);
	});

	test('heals a damaged ally without exceeding maximum HP', () => {
		const state = createInitialMatch();
		const sorcerer = getUnit(state, 'player1-sorcerer')!;
		const warrior = getUnit(state, 'player1-warrior')!;
		sorcerer.position = { file: 2, rank: 2 };
		warrior.position = { file: 3, rank: 3 };
		warrior.hp = 6;
		state.players.player1.energy = 2;

		const result = castSpell(state, sorcerer.id, 'mend', warrior.position);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(getUnit(result.state, warrior.id)?.hp).toBe(7);
		expect(getUnit(result.state, sorcerer.id)?.cooldowns.mend).toBe(3);
	});
});
