import {
	UNIT_DEFINITIONS,
	boardPositionLabel,
	canEndTurn,
	castSpell,
	createInitialMatch,
	deployUnit,
	endTurn,
	getDeploymentCells,
	getPlayerUnits,
	getSpell,
	getUnit,
	getUnitAt,
	getValidSpellTargets,
	positionsEqual,
	surrender,
	type BoardPosition,
	type BoardUnit,
	type MatchResult,
	type MatchState,
	type PlayerId,
	type SpellDefinition,
	type UnitState
} from '@stm/game';
import { useKeyboard, useRenderer } from '@opentui/react';
import { useMemo, useState } from 'react';
import { Board, createBoardText } from './components/Board.tsx';
import { moveSelection, type NavigationDirection } from './navigation.ts';

type PendingAction =
	| { kind: 'cast'; unitId: string; spellId: string; target: BoardPosition }
	| { kind: 'deploy'; unitId: string; target: BoardPosition }
	| { kind: 'end-turn' }
	| { kind: 'surrender' };

type Interaction =
	| { kind: 'browse' }
	| { kind: 'deploy'; unitId: string }
	| { kind: 'target'; unitId: string; spellId: string }
	| { kind: 'confirm'; action: PendingAction };

const STARTING_CURSOR: BoardPosition = { file: 0, rank: 0 };

function playerLabel(player: PlayerId): string {
	return player === 'player1' ? 'P1' : 'P2';
}

function asBoardUnits(state: MatchState): BoardUnit[] {
	return state.units
		.filter((unit) => unit.hp > 0 && unit.position)
		.map((unit) => ({
			id: unit.id,
			kind: unit.kind,
			displayNumber: unit.displayNumber,
			position: unit.position!,
			side: unit.controller === 'player1' ? 'allied' : 'enemy'
		}));
}

function unitLocation(unit: UnitState): string {
	if (unit.hp <= 0) return 'dead';
	return unit.position ? boardPositionLabel(unit.position) : '--';
}

function rosterLine(state: MatchState, player: PlayerId): string {
	const playerState = state.players[player];
	const active = state.status.kind === 'active' && state.activePlayer === player ? '>' : ' ';
	const units = getPlayerUnits(state, player)
		.map(
			(unit) =>
				`${unit.displayNumber}${UNIT_DEFINITIONS[unit.kind].name[0]} ${unit.hp}/${UNIT_DEFINITIONS[unit.kind].maxHp}@${unitLocation(unit)}`
		)
		.join('  ');
	return `${active}${playerLabel(player)} E${playerState.energy}  ${units}`;
}

function spellLine(unit: UnitState, spell: SpellDefinition, index: number): string {
	const remaining = unit.cooldowns[spell.id] ?? 0;
	return `${index + 1} ${spell.name} [${remaining === 0 ? 'ready' : `CD${remaining}`}] ${spell.summary}`;
}

function pendingLabel(state: MatchState, action: PendingAction): string {
	switch (action.kind) {
		case 'deploy': {
			const unit = getUnit(state, action.unitId)!;
			return `Deploy ${UNIT_DEFINITIONS[unit.kind].name} on ${boardPositionLabel(action.target)}?`;
		}
		case 'cast': {
			const unit = getUnit(state, action.unitId)!;
			const spell = getSpell(unit, action.spellId)!;
			return `${spell.name} on ${boardPositionLabel(action.target)}?`;
		}
		case 'end-turn':
			return 'End turn?';
		case 'surrender':
			return 'Surrender?';
	}
}

function isConfirmKey(name: string, sequence: string): boolean {
	return (
		name === 'enter' ||
		name === 'return' ||
		name === 'linefeed' ||
		name === 'space' ||
		name === 'kpenter' ||
		sequence === '\r' ||
		sequence === '\n' ||
		sequence === ' '
	);
}

function numberFromKey(name: string): number | null {
	return /^[1-4]$/.test(name) ? Number(name) : null;
}

export function App() {
	const renderer = useRenderer();
	const [match, setMatch] = useState(createInitialMatch);
	const [cursor, setCursor] = useState<BoardPosition>(STARTING_CURSOR);
	const [interaction, setInteraction] = useState<Interaction>({ kind: 'browse' });
	const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
	const [message, setMessage] = useState('P1: deploy your Monarch.');
	const boardUnits = useMemo(() => asBoardUnits(match), [match]);

	const highlightedPositions = useMemo(() => {
		if (interaction.kind === 'deploy') return getDeploymentCells(match, interaction.unitId);
		if (interaction.kind === 'target') {
			return getValidSpellTargets(match, interaction.unitId, interaction.spellId);
		}
		return [];
	}, [interaction, match]);

	function acceptResult(result: MatchResult, nextSelectedUnitId: string | null): void {
		if (!result.ok) {
			setMessage(result.error);
			return;
		}
		setMatch(result.state);
		setInteraction({ kind: 'browse' });
		setSelectedUnitId(nextSelectedUnitId);
		setMessage(result.state.log.at(-1) ?? 'Done.');
	}

	function execute(action: PendingAction): void {
		switch (action.kind) {
			case 'deploy':
				acceptResult(deployUnit(match, action.unitId, action.target), action.unitId);
				return;
			case 'cast':
				acceptResult(castSpell(match, action.unitId, action.spellId, action.target), action.unitId);
				return;
			case 'end-turn':
				acceptResult(endTurn(match), null);
				return;
			case 'surrender':
				acceptResult(surrender(match, match.activePlayer), null);
		}
	}

	function beginRosterSelection(number: number): void {
		const unit = getPlayerUnits(match, match.activePlayer)[number - 1];
		if (!unit || unit.hp <= 0) {
			setMessage('That unit is unavailable.');
			return;
		}
		if (!unit.position) {
			const cells = getDeploymentCells(match, unit.id);
			if (cells.length === 0) {
				setMessage(
					unit.kind === 'monarch'
						? 'Not enough energy to deploy.'
						: 'Deploy your Monarch first, or gain more energy.'
				);
				return;
			}
			setSelectedUnitId(unit.id);
			setInteraction({ kind: 'deploy', unitId: unit.id });
			setCursor(cells[0]!);
			setMessage(`Deploy ${UNIT_DEFINITIONS[unit.kind].name}.`);
			return;
		}
		setSelectedUnitId(unit.id);
		setCursor(unit.position);
		setMessage(`${UNIT_DEFINITIONS[unit.kind].name} selected. Choose a spell.`);
	}

	function beginSpell(number: number): void {
		if (!selectedUnitId) return;
		const unit = getUnit(match, selectedUnitId);
		if (!unit) return;
		const spell = UNIT_DEFINITIONS[unit.kind].spells[number - 1];
		if (!spell) {
			setMessage('No spell in that slot.');
			return;
		}
		if ((unit.cooldowns[spell.id] ?? 0) > 0) {
			setMessage(`${spell.name} has ${unit.cooldowns[spell.id]} cooldown remaining.`);
			return;
		}
		if (match.players[unit.controller].energy < 1) {
			setMessage('Not enough energy.');
			return;
		}
		const targets = getValidSpellTargets(match, unit.id, spell.id);
		if (targets.length === 0) {
			setMessage(`No valid targets for ${spell.name}.`);
			return;
		}
		setInteraction({ kind: 'target', unitId: unit.id, spellId: spell.id });
		setCursor(targets[0]!);
		setMessage(`${spell.name}: choose a target.`);
	}

	useKeyboard((key) => {
		if (key.name === 'c' && (key.meta || key.super)) {
			renderer.copyToClipboardOSC52(createBoardText(boardUnits, cursor, highlightedPositions));
			return;
		}
		if (key.name === 'q') {
			renderer.destroy();
			return;
		}
		if (match.status.kind === 'won') {
			if (key.name === 'r') {
				setMatch(createInitialMatch());
				setCursor(STARTING_CURSOR);
				setInteraction({ kind: 'browse' });
				setSelectedUnitId(null);
				setMessage('P1: deploy your Monarch.');
			}
			return;
		}

		if (interaction.kind === 'confirm') {
			if (isConfirmKey(key.name, key.sequence)) execute(interaction.action);
			else if (key.name === 'escape') {
				const action = interaction.action;
				setInteraction(
					action.kind === 'deploy'
						? { kind: 'deploy', unitId: action.unitId }
						: action.kind === 'cast'
							? { kind: 'target', unitId: action.unitId, spellId: action.spellId }
							: { kind: 'browse' }
				);
				setMessage('Cancelled.');
			}
			return;
		}

		const direction: NavigationDirection | undefined =
			key.name === 'left' || key.name === 'arrowleft'
				? 'left'
				: key.name === 'right' || key.name === 'arrowright'
					? 'right'
					: key.name === 'up' || key.name === 'arrowup'
						? 'up'
						: key.name === 'down' || key.name === 'arrowdown'
							? 'down'
							: undefined;
		if (direction) {
			setCursor((current) => moveSelection(current, direction));
			return;
		}

		if (key.name === 'escape') {
			if (interaction.kind !== 'browse') setInteraction({ kind: 'browse' });
			else setSelectedUnitId(null);
			setMessage('Back.');
			return;
		}

		if (interaction.kind === 'deploy' && isConfirmKey(key.name, key.sequence)) {
			if (!highlightedPositions.some((position) => positionsEqual(position, cursor))) {
				setMessage('Choose a highlighted deployment cell.');
				return;
			}
			setInteraction({
				kind: 'confirm',
				action: { kind: 'deploy', unitId: interaction.unitId, target: cursor }
			});
			return;
		}

		if (interaction.kind === 'target' && isConfirmKey(key.name, key.sequence)) {
			if (!highlightedPositions.some((position) => positionsEqual(position, cursor))) {
				setMessage('Choose a highlighted target.');
				return;
			}
			setInteraction({
				kind: 'confirm',
				action: {
					kind: 'cast',
					unitId: interaction.unitId,
					spellId: interaction.spellId,
					target: cursor
				}
			});
			return;
		}

		if (interaction.kind !== 'browse') return;

		if (key.name === 'e') {
			if (!canEndTurn(match)) {
				setMessage('Deploy your Monarch before ending the turn.');
				return;
			}
			setInteraction({ kind: 'confirm', action: { kind: 'end-turn' } });
			return;
		}
		if (key.name === 'x') {
			setInteraction({ kind: 'confirm', action: { kind: 'surrender' } });
			return;
		}

		const number = numberFromKey(key.name);
		if (number !== null) {
			if (selectedUnitId) beginSpell(number);
			else beginRosterSelection(number);
			return;
		}

		if (isConfirmKey(key.name, key.sequence)) {
			const unit = getUnitAt(match, cursor);
			if (unit?.controller === match.activePlayer) {
				setSelectedUnitId(unit.id);
				setMessage(`${UNIT_DEFINITIONS[unit.kind].name} selected. Choose a spell.`);
			} else {
				setMessage(
					unit
						? `${UNIT_DEFINITIONS[unit.kind].name}: ${unit.hp}/${UNIT_DEFINITIONS[unit.kind].maxHp} HP.`
						: `${boardPositionLabel(cursor)} is empty.`
				);
			}
		}
	});

	const selectedUnit = selectedUnitId ? getUnit(match, selectedUnitId) : undefined;
	const prompt =
		match.status.kind === 'won'
			? `${match.players[match.status.winner].name} wins by ${match.status.reason}. [R] restart [Q] quit`
			: interaction.kind === 'confirm'
				? `${pendingLabel(match, interaction.action)} [Enter/Space] confirm [Esc] cancel`
				: interaction.kind === 'deploy'
					? 'Choose a highlighted cell. [Enter/Space] select [Esc] back'
					: interaction.kind === 'target'
						? 'Choose a highlighted target. [Enter/Space] select [Esc] back'
						: selectedUnit
							? 'Choose spell [1-3]. [Esc] units'
							: 'Choose unit [1-4] or inspect with [Enter].';

	return (
		<box style={{ alignItems: 'center', flexDirection: 'column', height: '100%', width: '100%' }}>
			<text>SLAY THE MONARCH  Turn {match.turnNumber}</text>
			<text>{rosterLine(match, 'player2')}</text>
			<Board units={boardUnits} selectedPosition={cursor} highlightedPositions={highlightedPositions} />
			<text>{rosterLine(match, 'player1')}</text>
			{selectedUnit ? (
				<text>
					{playerLabel(selectedUnit.controller)} {UNIT_DEFINITIONS[selectedUnit.kind].name}:{' '}
					{UNIT_DEFINITIONS[selectedUnit.kind].spells
						.map((spell, index) => spellLine(selectedUnit, spell, index))
						.join(' | ')}
				</text>
			) : null}
			<text>{prompt}</text>
			<text>{message}</text>
			<text>Arrows move | E end | X surrender | Esc back | Q quit</text>
		</box>
	);
}
