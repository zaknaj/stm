import {
	BOARD_SIZE,
	boardPositionKey,
	boardPositionLabel,
	isBoardPosition,
	positionsEqual,
	type BoardPosition,
	type UnitKind
} from './board.ts';

export type PlayerId = 'player1' | 'player2';

type SpellEffect =
	| { kind: 'damage'; amount: number; targeting: 'adjacent-enemy' | 'line-enemy' | 'radius-enemy'; range: number }
	| { kind: 'heal'; amount: number; targeting: 'radius-ally'; range: number }
	| { kind: 'move'; movement: 'teleport' | 'walk'; range: number };

export type SpellDefinition = {
	id: string;
	name: string;
	summary: string;
	cooldown: number;
	effect: SpellEffect;
};

type UnitDefinition = {
	kind: UnitKind;
	name: string;
	maxHp: number;
	spells: readonly SpellDefinition[];
};

const UNIT_ORDER = ['monarch', 'ranger', 'warrior', 'sorcerer'] as const satisfies readonly UnitKind[];

export const UNIT_DEFINITIONS: Readonly<Record<UnitKind, UnitDefinition>> = {
	monarch: {
		kind: 'monarch',
		name: 'Monarch',
		maxHp: 8,
		spells: [
			{ id: 'step', name: 'Step', summary: 'Move 1', cooldown: 0, effect: { kind: 'move', movement: 'walk', range: 1 } },
			{ id: 'strike', name: 'Strike', summary: '2 damage adjacent', cooldown: 1, effect: { kind: 'damage', targeting: 'adjacent-enemy', range: 1, amount: 2 } }
		]
	},
	ranger: {
		kind: 'ranger',
		name: 'Ranger',
		maxHp: 4,
		spells: [
			{ id: 'stride', name: 'Stride', summary: 'Move up to 2', cooldown: 1, effect: { kind: 'move', movement: 'walk', range: 2 } },
			{ id: 'shot', name: 'Shot', summary: '2 damage in line 4', cooldown: 0, effect: { kind: 'damage', targeting: 'line-enemy', range: 4, amount: 2 } }
		]
	},
	warrior: {
		kind: 'warrior',
		name: 'Warrior',
		maxHp: 7,
		spells: [
			{ id: 'step', name: 'Step', summary: 'Move 1', cooldown: 0, effect: { kind: 'move', movement: 'walk', range: 1 } },
			{ id: 'slash', name: 'Slash', summary: '3 damage adjacent', cooldown: 1, effect: { kind: 'damage', targeting: 'adjacent-enemy', range: 1, amount: 3 } }
		]
	},
	sorcerer: {
		kind: 'sorcerer',
		name: 'Sorcerer',
		maxHp: 5,
		spells: [
			{ id: 'blink', name: 'Blink', summary: 'Teleport up to 2', cooldown: 2, effect: { kind: 'move', movement: 'teleport', range: 2 } },
			{ id: 'bolt', name: 'Bolt', summary: '2 damage within 2', cooldown: 1, effect: { kind: 'damage', targeting: 'radius-enemy', range: 2, amount: 2 } },
			{ id: 'mend', name: 'Mend', summary: 'Heal 2 within 2', cooldown: 3, effect: { kind: 'heal', targeting: 'radius-ally', range: 2, amount: 2 } }
		]
	}
};

export type UnitState = {
	id: string;
	controller: PlayerId;
	kind: UnitKind;
	displayNumber: 1 | 2 | 3 | 4;
	hp: number;
	position: BoardPosition | null;
	cooldowns: Record<string, number>;
};

type PlayerState = {
	id: PlayerId;
	name: string;
	energy: number;
	turnsStarted: number;
};

type MatchStatus =
	| { kind: 'active' }
	| { kind: 'won'; winner: PlayerId; reason: 'monarch' | 'surrender' };

export type MatchState = {
	activePlayer: PlayerId;
	players: Record<PlayerId, PlayerState>;
	units: UnitState[];
	status: MatchStatus;
	turnNumber: number;
	log: string[];
};

type MatchResult =
	| { ok: true; state: MatchState }
	| { ok: false; error: string };

export type MatchAction =
	| { kind: 'cast'; unitId: string; spellId: string; target: BoardPosition }
	| { kind: 'deploy'; unitId: string; target: BoardPosition }
	| { kind: 'end-turn' }
	| { kind: 'surrender' };

const PLAYER_IDS = ['player1', 'player2'] as const;
const ORTHOGONAL_STEPS = [
	{ file: 1, rank: 0 },
	{ file: -1, rank: 0 },
	{ file: 0, rank: 1 },
	{ file: 0, rank: -1 }
] as const;

function createUnit(controller: PlayerId, kind: UnitKind, index: number): UnitState {
	const definition = UNIT_DEFINITIONS[kind];
	return {
		id: `${controller}-${kind}`,
		controller,
		kind,
		displayNumber: (index + 1) as UnitState['displayNumber'],
		hp: definition.maxHp,
		position: null,
		cooldowns: Object.fromEntries(definition.spells.map((spell) => [spell.id, 0]))
	};
}

function cloneMatch(state: MatchState): MatchState {
	return {
		...state,
		players: {
			player1: { ...state.players.player1 },
			player2: { ...state.players.player2 }
		},
		units: state.units.map((unit) => ({
			...unit,
			position: unit.position ? { ...unit.position } : null,
			cooldowns: { ...unit.cooldowns }
		})),
		status: { ...state.status },
		log: [...state.log]
	};
}

function appendLog(state: MatchState, message: string): void {
	state.log.push(message);
	if (state.log.length > 40) {
		state.log.splice(0, state.log.length - 40);
	}
}

function energyGain(player: PlayerId, turnsStarted: number): number {
	if (player === 'player1') {
		return turnsStarted === 0 ? 1 : turnsStarted === 1 ? 2 : 3;
	}
	return turnsStarted === 0 ? 2 : 3;
}

function startTurnInPlace(state: MatchState, player: PlayerId): void {
	const playerState = state.players[player];
	const gained = energyGain(player, playerState.turnsStarted);
	playerState.turnsStarted += 1;
	playerState.energy += gained;
	for (const unit of state.units) {
		if (unit.controller !== player) continue;
		for (const spellId of Object.keys(unit.cooldowns)) {
			unit.cooldowns[spellId] = Math.max(0, unit.cooldowns[spellId] - 1);
		}
	}
	appendLog(state, `${playerState.name} gains ${gained} energy.`);
}

export function createInitialMatch(): MatchState {
	const state: MatchState = {
		activePlayer: 'player1',
		players: {
			player1: { id: 'player1', name: 'Player 1', energy: 0, turnsStarted: 0 },
			player2: { id: 'player2', name: 'Player 2', energy: 0, turnsStarted: 0 }
		},
		units: PLAYER_IDS.flatMap((player) => UNIT_ORDER.map((kind, index) => createUnit(player, kind, index))),
		status: { kind: 'active' },
		turnNumber: 1,
		log: []
	};
	startTurnInPlace(state, 'player1');
	return state;
}

function otherPlayer(player: PlayerId): PlayerId {
	return player === 'player1' ? 'player2' : 'player1';
}

export function getUnit(state: MatchState, unitId: string): UnitState | undefined {
	return state.units.find((unit) => unit.id === unitId);
}

export function getUnitAt(state: MatchState, position: BoardPosition): UnitState | undefined {
	return state.units.find(
		(unit) => unit.hp > 0 && unit.position !== null && positionsEqual(unit.position, position)
	);
}

export function getPlayerUnits(state: MatchState, player: PlayerId): UnitState[] {
	return state.units.filter((unit) => unit.controller === player);
}

export function getSpell(unit: UnitState, spellId: string): SpellDefinition | undefined {
	return UNIT_DEFINITIONS[unit.kind].spells.find((spell) => spell.id === spellId);
}

export function getDeploymentCells(state: MatchState, unitId: string): BoardPosition[] {
	if (state.status.kind !== 'active') return [];
	const unit = getUnit(state, unitId);
	if (!unit || unit.controller !== state.activePlayer || unit.hp <= 0 || unit.position) return [];
	const monarch = state.units.find(
		(candidate) => candidate.controller === unit.controller && candidate.kind === 'monarch'
	);
	if (unit.kind !== 'monarch' && !monarch?.position) return [];
	if (state.players[unit.controller].energy < 1) return [];

	const ranks = unit.controller === 'player1' ? [0, 1] : [BOARD_SIZE - 2, BOARD_SIZE - 1];
	return ranks.flatMap((rank) =>
		Array.from({ length: BOARD_SIZE }, (_, file) => ({ file, rank })).filter(
			(position) => !getUnitAt(state, position)
		)
	);
}

function includesPosition(positions: readonly BoardPosition[], target: BoardPosition): boolean {
	return positions.some((position) => positionsEqual(position, target));
}

function activeActionError(state: MatchState, player: PlayerId): string | null {
	if (state.status.kind !== 'active') return 'The match is over.';
	if (state.activePlayer !== player) return 'It is not that player’s turn.';
	return null;
}

function deployUnit(state: MatchState, unitId: string, position: BoardPosition): MatchResult {
	const unit = getUnit(state, unitId);
	if (!unit) return { ok: false, error: 'Unit not found.' };
	const actionError = activeActionError(state, unit.controller);
	if (actionError) return { ok: false, error: actionError };
	if (!includesPosition(getDeploymentCells(state, unitId), position)) {
		return { ok: false, error: 'That unit cannot be deployed there.' };
	}

	const next = cloneMatch(state);
	const nextUnit = getUnit(next, unitId)!;
	next.players[nextUnit.controller].energy -= 1;
	nextUnit.position = { ...position };
	appendLog(next, `${next.players[nextUnit.controller].name} deploys ${UNIT_DEFINITIONS[nextUnit.kind].name} on ${boardPositionLabel(position)}.`);
	return { ok: true, state: next };
}

function chebyshevDistance(left: BoardPosition, right: BoardPosition): number {
	return Math.max(Math.abs(left.file - right.file), Math.abs(left.rank - right.rank));
}

function walkTargets(state: MatchState, origin: BoardPosition, range: number): BoardPosition[] {
	const visited = new Set([boardPositionKey(origin)]);
	const queue: Array<{ position: BoardPosition; distance: number }> = [{ position: origin, distance: 0 }];
	const targets: BoardPosition[] = [];

	while (queue.length > 0) {
		const current = queue.shift()!;
		if (current.distance === range) continue;
		for (const step of ORTHOGONAL_STEPS) {
			const position = {
				file: current.position.file + step.file,
				rank: current.position.rank + step.rank
			};
			const key = boardPositionKey(position);
			if (!isBoardPosition(position) || visited.has(key) || getUnitAt(state, position)) continue;
			visited.add(key);
			targets.push(position);
			queue.push({ position, distance: current.distance + 1 });
		}
	}

	return targets;
}

function teleportTargets(state: MatchState, origin: BoardPosition, range: number): BoardPosition[] {
	const targets: BoardPosition[] = [];
	for (let rank = 0; rank < BOARD_SIZE; rank += 1) {
		for (let file = 0; file < BOARD_SIZE; file += 1) {
			const position = { file, rank };
			const distance = chebyshevDistance(origin, position);
			if (distance >= 1 && distance <= range && !getUnitAt(state, position)) targets.push(position);
		}
	}
	return targets;
}

function positionsInRange(
	origin: BoardPosition,
	predicate: (position: BoardPosition) => boolean,
	includeOrigin = false
): BoardPosition[] {
	const positions: BoardPosition[] = [];
	for (let rank = 0; rank < BOARD_SIZE; rank += 1) {
		for (let file = 0; file < BOARD_SIZE; file += 1) {
			const position = { file, rank };
			if ((includeOrigin || !positionsEqual(origin, position)) && predicate(position)) positions.push(position);
		}
	}
	return positions;
}

/** The geometric spell range, before occupancy, resources, cooldowns, and target validity. */
export function getSpellRange(state: MatchState, unitId: string, spellId: string): BoardPosition[] {
	const caster = getUnit(state, unitId);
	if (!caster?.position || caster.hp <= 0) return [];
	const spell = getSpell(caster, spellId);
	if (!spell) return [];
	const origin = caster.position;
	const effect = spell.effect;

	if (effect.kind === 'move' && effect.movement === 'walk') {
		return positionsInRange(
			origin,
			(position) =>
				Math.abs(position.file - origin.file) + Math.abs(position.rank - origin.rank) <= effect.range
		);
	}

	if (effect.kind === 'damage' && effect.targeting === 'line-enemy') {
		return positionsInRange(origin, (position) => {
			const fileDelta = Math.abs(position.file - origin.file);
			const rankDelta = Math.abs(position.rank - origin.rank);
			return (
				Math.max(fileDelta, rankDelta) <= effect.range &&
				(fileDelta === 0 || rankDelta === 0 || fileDelta === rankDelta)
			);
		});
	}

	return positionsInRange(
		origin,
		(position) => chebyshevDistance(origin, position) <= effect.range,
		effect.kind === 'heal'
	);
}

function isClearLine(state: MatchState, origin: BoardPosition, target: BoardPosition): boolean {
	const fileDelta = target.file - origin.file;
	const rankDelta = target.rank - origin.rank;
	const distance = Math.max(Math.abs(fileDelta), Math.abs(rankDelta));
	const aligned = fileDelta === 0 || rankDelta === 0 || Math.abs(fileDelta) === Math.abs(rankDelta);
	if (!aligned || distance === 0) return false;
	const fileStep = Math.sign(fileDelta);
	const rankStep = Math.sign(rankDelta);
	for (let index = 1; index < distance; index += 1) {
		if (getUnitAt(state, { file: origin.file + fileStep * index, rank: origin.rank + rankStep * index })) {
			return false;
		}
	}
	return true;
}

function targetUnits(
	state: MatchState,
	caster: UnitState,
	predicate: (position: BoardPosition) => boolean,
	allied: boolean
): BoardPosition[] {
	return state.units
		.filter(
			(unit) =>
				unit.hp > 0 &&
				unit.position &&
				(allied ? unit.controller === caster.controller : unit.controller !== caster.controller) &&
				predicate(unit.position)
		)
		.map((unit) => ({ ...unit.position! }));
}

function spellActionError(state: MatchState, caster: UnitState, spell: SpellDefinition): string | null {
	const activeError = activeActionError(state, caster.controller);
	if (activeError) return activeError;
	if (caster.hp <= 0) return 'That unit is dead.';
	if (!caster.position) return 'That unit is undeployed.';
	if (state.players[caster.controller].energy < 1) return 'Not enough energy.';
	if ((caster.cooldowns[spell.id] ?? 0) > 0) return `${spell.name} is on cooldown.`;
	return null;
}

export function getValidSpellTargets(state: MatchState, unitId: string, spellId: string): BoardPosition[] {
	const caster = getUnit(state, unitId);
	if (!caster) return [];
	const spell = getSpell(caster, spellId);
	if (!spell || spellActionError(state, caster, spell) || !caster.position) return [];
	const origin = caster.position;
	const effect = spell.effect;

	if (effect.kind === 'move') {
		return effect.movement === 'walk'
			? walkTargets(state, origin, effect.range)
			: teleportTargets(state, origin, effect.range);
	}

	if (effect.kind === 'heal') {
		return targetUnits(
			state,
			caster,
			(position) => {
				const target = getUnitAt(state, position)!;
				return chebyshevDistance(origin, position) <= effect.range && target.hp < UNIT_DEFINITIONS[target.kind].maxHp;
			},
			true
		);
	}

	if (effect.targeting === 'adjacent-enemy') {
		return targetUnits(state, caster, (position) => chebyshevDistance(origin, position) <= effect.range, false);
	}
	if (effect.targeting === 'line-enemy') {
		return targetUnits(
			state,
			caster,
			(position) => chebyshevDistance(origin, position) <= effect.range && isClearLine(state, origin, position),
			false
		);
	}
	return targetUnits(state, caster, (position) => chebyshevDistance(origin, position) <= effect.range, false);
}

function castSpell(
	state: MatchState,
	unitId: string,
	spellId: string,
	target: BoardPosition
): MatchResult {
	const caster = getUnit(state, unitId);
	if (!caster) return { ok: false, error: 'Unit not found.' };
	const spell = getSpell(caster, spellId);
	if (!spell) return { ok: false, error: 'Spell not found.' };
	const actionError = spellActionError(state, caster, spell);
	if (actionError) return { ok: false, error: actionError };
	if (!includesPosition(getValidSpellTargets(state, unitId, spellId), target)) {
		return { ok: false, error: 'That is not a valid target.' };
	}

	const next = cloneMatch(state);
	const nextCaster = getUnit(next, unitId)!;
	next.players[nextCaster.controller].energy -= 1;
	nextCaster.cooldowns[spell.id] = spell.cooldown;
	const casterName = UNIT_DEFINITIONS[nextCaster.kind].name;

	if (spell.effect.kind === 'move') {
		nextCaster.position = { ...target };
		appendLog(next, `${casterName} uses ${spell.name} to ${boardPositionLabel(target)}.`);
		return { ok: true, state: next };
	}

	const targetUnit = getUnitAt(next, target)!;
	if (spell.effect.kind === 'heal') {
		const maximum = UNIT_DEFINITIONS[targetUnit.kind].maxHp;
		const healed = Math.min(spell.effect.amount, maximum - targetUnit.hp);
		targetUnit.hp += healed;
		appendLog(next, `${casterName} uses ${spell.name}; ${UNIT_DEFINITIONS[targetUnit.kind].name} heals ${healed}.`);
		return { ok: true, state: next };
	}

	targetUnit.hp = Math.max(0, targetUnit.hp - spell.effect.amount);
	appendLog(next, `${casterName} uses ${spell.name}; ${UNIT_DEFINITIONS[targetUnit.kind].name} takes ${spell.effect.amount}.`);
	if (targetUnit.hp === 0) {
		targetUnit.position = null;
		appendLog(next, `${UNIT_DEFINITIONS[targetUnit.kind].name} dies.`);
		if (targetUnit.kind === 'monarch') {
			next.status = { kind: 'won', winner: nextCaster.controller, reason: 'monarch' };
			appendLog(next, `${next.players[nextCaster.controller].name} wins.`);
		}
	}
	return { ok: true, state: next };
}

export function canEndTurn(state: MatchState): boolean {
	if (state.status.kind !== 'active') return false;
	const monarch = state.units.find(
		(unit) => unit.controller === state.activePlayer && unit.kind === 'monarch'
	);
	return Boolean(monarch?.position && monarch.hp > 0);
}

function endTurn(state: MatchState): MatchResult {
	if (state.status.kind !== 'active') return { ok: false, error: 'The match is over.' };
	if (!canEndTurn(state)) return { ok: false, error: 'Deploy your monarch before ending the turn.' };
	const next = cloneMatch(state);
	next.activePlayer = otherPlayer(state.activePlayer);
	next.turnNumber += 1;
	startTurnInPlace(next, next.activePlayer);
	return { ok: true, state: next };
}

function surrender(state: MatchState, player: PlayerId): MatchResult {
	const actionError = activeActionError(state, player);
	if (actionError) return { ok: false, error: actionError };
	const next = cloneMatch(state);
	const winner = otherPlayer(player);
	next.status = { kind: 'won', winner, reason: 'surrender' };
	appendLog(next, `${next.players[player].name} surrenders. ${next.players[winner].name} wins.`);
	return { ok: true, state: next };
}

export function applyMatchAction(
	state: MatchState,
	player: PlayerId,
	action: MatchAction
): MatchResult {
	if (state.activePlayer !== player) return { ok: false, error: 'It is not your turn.' };
	switch (action.kind) {
		case 'deploy':
			return deployUnit(state, action.unitId, action.target);
		case 'cast':
			return castSpell(state, action.unitId, action.spellId, action.target);
		case 'end-turn':
			return endTurn(state);
		case 'surrender':
			return surrender(state, player);
	}
}
