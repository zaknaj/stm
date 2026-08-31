import {
	BOARD_SIZE,
	UNIT_DEFINITIONS,
	boardPositionLabel,
	canEndTurn,
	getDeploymentCells,
	getPlayerUnits,
	getSpell,
	getSpellRange,
	getUnit,
	getUnitAt,
	getValidSpellTargets,
	positionsEqual,
	type BoardPosition,
	type BoardUnit,
	type MatchAction,
	type MatchState,
	type PlayerId,
	type SpellDefinition,
	type UnitState,
	type UnitKind
} from '@stm/game';
import { StyledText, bold, dim, fg } from '@opentui/core';
import { useKeyboard, useRenderer } from '@opentui/react';
import { useEffect, useMemo, useState } from 'react';
import { Board, createBoardText } from './components/Board.tsx';

type Interaction =
	| { kind: 'home' }
	| { kind: 'select' }
	| { kind: 'deploy'; unitId: string }
	| { kind: 'target'; unitId: string; spellId: string }
	| { kind: 'confirm-surrender' };

type MatchAppProps = {
	match: MatchState;
	localPlayer: PlayerId;
	onAction: (
		action: MatchAction
	) => Promise<{ ok: true; message: string } | { ok: false; error: string }>;
	onRestart: () => void;
};

const STARTING_CURSOR: BoardPosition = { file: 0, rank: 0 };
const GOLD = 'yellow';
const ALLY = 'cyan';
const ENEMY = 'red';
const MUTED = 'gray';
const WHITE = 'white';
const PANEL_WIDTH = 33;
const UNIT_SHORTCUTS: Readonly<Record<UnitKind, string>> = {
	monarch: 'm',
	ranger: 'r',
	warrior: 'w',
	sorcerer: 's'
};
const ROSTER_DISPLAY_ORDER: readonly UnitKind[] = ['monarch', 'warrior', 'sorcerer', 'ranger'];
type NavigationDirection = 'down' | 'left' | 'right' | 'up';

function moveSelection(
	position: BoardPosition,
	direction: NavigationDirection,
	flipped: boolean
): BoardPosition {
	const wrap = (value: number) => (value + BOARD_SIZE) % BOARD_SIZE;
	switch (direction) {
		case 'left':
			return { file: wrap(position.file + (flipped ? 1 : -1)), rank: position.rank };
		case 'right':
			return { file: wrap(position.file + (flipped ? -1 : 1)), rank: position.rank };
		case 'up':
			return { file: position.file, rank: wrap(position.rank + (flipped ? -1 : 1)) };
		case 'down':
			return { file: position.file, rank: wrap(position.rank + (flipped ? 1 : -1)) };
	}
}

function asBoardUnits(state: MatchState, localPlayer: PlayerId): BoardUnit[] {
	return state.units
		.filter((unit) => unit.hp > 0 && unit.position)
		.map((unit) => ({
			kind: unit.kind,
			hp: unit.hp,
			position: unit.position!,
			side: unit.controller === localPlayer ? 'allied' : 'enemy'
		}));
}

function getDeploymentCandidateCells(state: MatchState, unitId: string): BoardPosition[] {
	const unit = getUnit(state, unitId);
	if (!unit || unit.position) return [];
	const ranks = unit.controller === 'player1' ? [0, 1] : [BOARD_SIZE - 2, BOARD_SIZE - 1];
	return ranks.flatMap((rank) =>
		Array.from({ length: BOARD_SIZE }, (_, file) => ({ file, rank }))
	);
}

function spellIsAvailable(state: MatchState, unit: UnitState, spell: SpellDefinition): boolean {
	return (
		state.activePlayer === unit.controller &&
		state.players[unit.controller].energy >= 1 &&
		(unit.cooldowns[spell.id] ?? 0) === 0
	);
}

function spellInfoLine(
	state: MatchState,
	unit: UnitState,
	spell: SpellDefinition,
	index: number
): StyledText {
	const remaining = unit.cooldowns[spell.id] ?? 0;
	const shortcut = `[${index + 1}]`;
	const line = `${spell.name.padEnd(22)}${remaining === 0 ? 'rdy' : `~${remaining}`}`;
	if (remaining > 0 || state.players[unit.controller].energy < 1 || state.activePlayer !== unit.controller) {
		return new StyledText([dim(`${shortcut} ${line}`)]);
	}
	return new StyledText([
		spellIsAvailable(state, unit, spell) ? bold(fg(GOLD)(`${shortcut} `)) : fg(WHITE)(`${shortcut} `),
		fg(WHITE)(line)
	]);
}

function labeledBorder(label: string | null, bottom: boolean, color = MUTED): StyledText {
	const labelText = label ? ` ${label} ` : '';
	const remaining = Math.max(0, PANEL_WIDTH - 2 - labelText.length);
	const left = Math.floor(remaining / 2);
	const right = remaining - left;
	const labelChunk = !label
		? null
		: color === ENEMY
			? bold(fg(ENEMY)(labelText))
			: dim(fg(MUTED)(labelText));
	return new StyledText([
		fg(MUTED)(bottom ? '└' : '┌'),
		fg(MUTED)('─'.repeat(left)),
		...(labelChunk ? [labelChunk] : []),
		fg(MUTED)('─'.repeat(right)),
		fg(MUTED)(bottom ? '┘' : '┐')
	]);
}

function boxLine(content: StyledText): StyledText {
	const contentWidth = content.chunks.reduce((width, chunk) => width + chunk.text.length, 0);
	return new StyledText([
		fg(MUTED)('│ '),
		...content.chunks,
		fg(MUTED)(' '.repeat(Math.max(0, PANEL_WIDTH - 4 - contentWidth))),
		fg(MUTED)(' │')
	]);
}

function playerStatusBar(name: string, energy: number, active: boolean): StyledText[] {
	const label = active ? bold(fg(GOLD)(name)) : dim(name);
	const energyText = `${energy}✦`;
	const energyLabel = active ? bold(fg(GOLD)(energyText)) : dim(energyText);
	const contentWidth = PANEL_WIDTH - 2;
	const leftPadding = ' ';
	const rightPadding = ' ';
	const spaceCount = Math.max(
		1,
		contentWidth - leftPadding.length - name.length - energyText.length - rightPadding.length
	);

	return [
		new StyledText([fg(MUTED)(`  ┌${'─'.repeat(PANEL_WIDTH - 2)}┐`)]),
		new StyledText([
			fg(MUTED)('  │'),
			fg(MUTED)(leftPadding),
			label,
			fg(MUTED)(' '.repeat(spaceCount)),
			energyLabel,
			fg(MUTED)(rightPadding),
			fg(MUTED)('│')
		]),
		new StyledText([fg(MUTED)(`  └${'─'.repeat(PANEL_WIDTH - 2)}┘`)])
	];
}

function cellInfoLine(state: MatchState, position: BoardPosition, localPlayer: PlayerId): StyledText | null {
	const unit = getUnitAt(state, position);
	if (!unit) return null;
	return new StyledText([
		bold(fg(GOLD)(boardPositionLabel(position))),
		fg(MUTED)('  ·  '),
		...(unit.controller === localPlayer
			? [bold(fg(ALLY)(`YOUR ${displayUnitName(state, unit)} ${unit.hp}/${UNIT_DEFINITIONS[unit.kind].maxHp}`))]
			: [
				bold(fg(ENEMY)('Enemy')),
				bold(fg(WHITE)(` ${displayUnitName(state, unit)} ${unit.hp}/${UNIT_DEFINITIONS[unit.kind].maxHp}`))
			])
	]);
}

function plainCellInfoLine(state: MatchState, position: BoardPosition, localPlayer: PlayerId): StyledText | null {
	const unit = getUnitAt(state, position);
	if (!unit) return null;
	return new StyledText([
		fg(WHITE)(boardPositionLabel(position)),
		fg(WHITE)('  ·  '),
		...(unit.controller === localPlayer
			? [fg(WHITE)(`YOUR ${displayUnitName(state, unit)} ${unit.hp}/${UNIT_DEFINITIONS[unit.kind].maxHp}`)]
			: [bold(fg(ENEMY)('Enemy')), fg(WHITE)(` ${displayUnitName(state, unit)} ${unit.hp}/${UNIT_DEFINITIONS[unit.kind].maxHp}`)])
	]);
}

function displayUnitName(state: MatchState, unit: UnitState): string {
	const sameKind = getPlayerUnits(state, unit.controller).filter((candidate) => candidate.kind === unit.kind);
	const name = UNIT_DEFINITIONS[unit.kind].name;
	return sameKind.length > 1 ? `${name} ${unit.displayNumber}` : name;
}

function unitDetailBox(
	state: MatchState,
	unit: UnitState,
	position: BoardPosition,
	localPlayer: PlayerId
): StyledText[] {
	const label = `${displayUnitName(state, unit)} (${boardPositionLabel(position)})`;
	const enemy = unit.controller !== localPlayer;
	const labelPadding = ' '.repeat(Math.max(0, 25 - label.length));
	const hp = `hp:${unit.hp}`;
	const header = boxLine(new StyledText([fg(WHITE)(`${label}${labelPadding}${hp}`)]));
	const spellLines = UNIT_DEFINITIONS[unit.kind].spells.map((spell, index) => {
		const line = spellInfoLine(state, unit, spell, index);
		return boxLine(line);
	});
	return [
		labeledBorder(enemy ? 'Enemy' : 'Unit', false, enemy ? ENEMY : MUTED),
		header,
		new StyledText([fg(MUTED)(`│${' '.repeat(PANEL_WIDTH - 2)}│`)]),
		...spellLines,
		labeledBorder(null, true)
	];
}

function spellStatusLabel(
	state: MatchState,
	unit: UnitState,
	spell: SpellDefinition
): string | null {
	if ((unit.cooldowns[spell.id] ?? 0) > 0) return 'on cooldown';
	if (state.players[unit.controller].energy < 1) return 'not enough energy';
	return null;
}

function spellDefinitionBox(
	state: MatchState,
	unit: UnitState,
	spell: SpellDefinition
): StyledText[] {
	const status = spellStatusLabel(state, unit, spell);
	const attributes = spell.effect.kind === 'damage'
		? `damage ${spell.effect.amount}  ·  range ${spell.effect.range}  ·  cd ${spell.cooldown}`
		: spell.effect.kind === 'heal'
			? `heal ${spell.effect.amount}  ·  range ${spell.effect.range}  ·  cd ${spell.cooldown}`
			: `${spell.effect.movement} ${spell.effect.range}  ·  cd ${spell.cooldown}`;
	return [
		labeledBorder('Spell', false),
		boxLine(new StyledText([fg(WHITE)(spell.name)])),
		boxLine(new StyledText([fg(WHITE)(spell.summary)])),
		boxLine(new StyledText([fg(WHITE)(attributes)])),
		labeledBorder(status, true)
	];
}

function surrenderBox(): StyledText[] {
	return [
		labeledBorder('Surrender', false, ENEMY),
		boxLine(new StyledText([bold(fg(ENEMY)('Surrender — are you sure?'))])),
		boxLine(new StyledText([bold(fg(ENEMY)('[ OK ]')), dim('  Confirm surrender')])),
		labeledBorder(null, true)
	];
}

function placementBox(
	units: readonly UnitState[],
	allUnits: readonly UnitState[],
	availableUnitIds: ReadonlySet<string>
): StyledText[] {
	if (units.length === 0) return [];
	return [
		labeledBorder('Placement', false),
		...rosterActionLines(units, allUnits, availableUnitIds).map(boxLine),
		labeledBorder(null, true)
	];
}

function footerLine(options: {
	ok?: boolean;
	cancel?: boolean;
	surrender?: boolean;
	endTurn?: boolean;
}): StyledText | null {
	const labels = [
		options.ok ? 'OK (enter)' : null,
		options.cancel ? 'cancel (esc)' : null,
		options.surrender ? 'surrender (esc)' : null,
		options.endTurn ? 'end turn (t)' : null
	].filter((label): label is string => label !== null);
	return labels.length > 0 ? new StyledText([dim(labels.join(' · '))]) : null;
}

function withFooter(lines: StyledText[], options: Parameters<typeof footerLine>[0]): StyledText[] {
	const footer = footerLine(options);
	return footer ? [...lines, new StyledText([]), footer] : lines;
}

function unitShortcut(unit: UnitState, units: readonly UnitState[]): string {
	const prefix = UNIT_SHORTCUTS[unit.kind];
	if (unit.kind === 'monarch') return prefix;
	const sameKind = units.filter((candidate) => candidate.kind === unit.kind);
	return sameKind.length > 1 ? `${prefix}${sameKind.indexOf(unit) + 1}` : prefix;
}

function rosterActionLines(
	units: readonly UnitState[],
	allUnits: readonly UnitState[],
	availableUnitIds: ReadonlySet<string>
): StyledText[] {
	const orderedUnits = [...units].sort(
		(left, right) => ROSTER_DISPLAY_ORDER.indexOf(left.kind) - ROSTER_DISPLAY_ORDER.indexOf(right.kind)
	);
	return orderedUnits.map((unit) =>
		availableUnitIds.has(unit.id)
			? new StyledText([
				bold(fg(GOLD)(`[${unitShortcut(unit, allUnits)}]`)),
				dim(` place ${UNIT_DEFINITIONS[unit.kind].name.toLowerCase()}`)
			])
			: new StyledText([dim(`[${unitShortcut(unit, allUnits)}] place ${UNIT_DEFINITIONS[unit.kind].name.toLowerCase()}`)])
	);
}

function indentInfoLine(line: StyledText): StyledText {
	return new StyledText([dim('  '), ...line.chunks]);
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

export function MatchApp({
	match,
	localPlayer,
	onAction,
	onRestart
}: MatchAppProps) {
	const renderer = useRenderer();
	const [cursor, setCursor] = useState<BoardPosition>(STARTING_CURSOR);
	const [interaction, setInteraction] = useState<Interaction>({ kind: 'home' });
	const [classShortcut, setClassShortcut] = useState<UnitKind | null>(null);
	const [message, setMessage] = useState(match.log.at(-1) ?? 'Deploy your Monarch.');
	const [busy, setBusy] = useState(false);
	const boardUnits = useMemo(() => asBoardUnits(match, localPlayer), [localPlayer, match]);
	const flipped = localPlayer === 'player2';

	useEffect(() => {
		setMessage(match.log.at(-1) ?? 'Deploy your Monarch.');
	}, [match.log]);

	useEffect(() => {
		setInteraction({ kind: 'home' });
		setClassShortcut(null);
	}, [localPlayer, match.activePlayer]);

	useEffect(() => {
		if (match.status.kind === 'won') {
			setInteraction({ kind: 'home' });
			setClassShortcut(null);
		}
	}, [match.status.kind]);

	useEffect(() => {
		setCursor(localPlayer === 'player1' ? { file: 0, rank: 0 } : { file: 7, rank: 7 });
	}, [localPlayer]);

	const targetSpellInputAvailable = useMemo(() => {
		if (interaction.kind !== 'target') return false;
		const unit = getUnit(match, interaction.unitId);
		const spell = unit ? getSpell(unit, interaction.spellId) : undefined;
		return Boolean(unit && spell && spellIsAvailable(match, unit, spell));
	}, [interaction, match]);

	const boardAction = useMemo(() => {
		if (interaction.kind === 'deploy') {
			const valid = getDeploymentCells(match, interaction.unitId);
			return { range: getDeploymentCandidateCells(match, interaction.unitId), valid };
		}
		if (interaction.kind === 'target') {
			return {
				range: getSpellRange(match, interaction.unitId, interaction.spellId),
				valid: getValidSpellTargets(match, interaction.unitId, interaction.spellId)
			};
		}
		return { range: [], valid: [] };
	}, [interaction, match]);
	const boardRange = boardAction.range;
	const boardValid = boardAction.valid;
	const selectedPosition =
		match.status.kind === 'won' ||
		interaction.kind === 'home' ||
		interaction.kind === 'confirm-surrender'
			? null
			: cursor;

	async function execute(action: MatchAction): Promise<void> {
		setBusy(true);
		try {
			const result = await onAction(action);
			if (!result.ok) {
				setMessage(result.error);
				return;
			}
			if (action.kind === 'cast') {
				const caster = getUnit(match, action.unitId);
				const spell = caster ? getSpell(caster, action.spellId) : undefined;
				const returnPosition = spell?.effect.kind === 'move'
					? action.target
					: caster?.position;
				if (returnPosition) setCursor(returnPosition);
				setInteraction({ kind: 'select' });
			} else {
				setInteraction({ kind: 'home' });
			}
			setClassShortcut(null);
			setMessage(result.message);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not send the action.');
		} finally {
			setBusy(false);
		}
	}

	function beginUnitSelection(unit: UnitState | undefined, preferredPosition?: BoardPosition): void {
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
			setInteraction({ kind: 'deploy', unitId: unit.id });
			setCursor(
				preferredPosition && cells.some((cell) => positionsEqual(cell, preferredPosition))
					? preferredPosition
					: cells[0]!
			);
			setMessage(`Deploy ${UNIT_DEFINITIONS[unit.kind].name}.`);
			return;
		}
		setCursor(unit.position);
		setInteraction({ kind: 'select' });
		setMessage(`${UNIT_DEFINITIONS[unit.kind].name} selected. Choose a spell.`);
	}

	function beginClassSelection(kind: UnitKind, preferredPosition?: BoardPosition): void {
		const units = getPlayerUnits(match, match.activePlayer).filter((unit) => unit.kind === kind);
		const deployable = units.filter((unit) => getDeploymentCells(match, unit.id).length > 0);
		if (deployable.length === 0) {
			setMessage('That action is unavailable.');
			return;
		}
		if (units.length === 1) {
			beginUnitSelection(deployable[0], preferredPosition);
			return;
		}
		setClassShortcut(kind);
		setMessage(`Choose a ${UNIT_DEFINITIONS[kind].name} number.`);
	}

	function beginSpell(unitId: string, number: number): void {
		const unit = getUnit(match, unitId);
		if (!unit) return;
		const spell = UNIT_DEFINITIONS[unit.kind].spells[number - 1];
		if (!spell) {
			setMessage('No spell in that slot.');
			return;
		}
		const targets = getValidSpellTargets(match, unit.id, spell.id);
		setInteraction({ kind: 'target', unitId: unit.id, spellId: spell.id });
		if (unit.position) setCursor(unit.position);
		if (!spellIsAvailable(match, unit, spell)) {
			const remaining = unit.cooldowns[spell.id] ?? 0;
			const reason = remaining > 0
				? `cooldown ~${remaining}`
				: match.players[unit.controller].energy < 1
					? 'not enough energy'
					: 'not playable right now';
			setMessage(`${spell.name}: not playable (${reason}).`);
		} else {
			setMessage(
				targets.length > 0
					? `${spell.name}: ${targets.length} valid target${targets.length === 1 ? '' : 's'}.`
					: `${spell.name}: no valid targets right now.`
			);
		}
	}

	useKeyboard((key) => {
		if (key.name === 'c' && (key.meta || key.super)) {
			renderer.copyToClipboardOSC52(createBoardText(boardUnits, selectedPosition, boardRange, boardValid, flipped));
			return;
		}
		if (key.name === 'q') {
			renderer.destroy();
			return;
		}
		if (match.status.kind === 'won') {
			if (key.name === 'r') onRestart();
			return;
		}
		if (busy) return;
		if (interaction.kind === 'confirm-surrender') {
			if (isConfirmKey(key.name, key.sequence)) {
				void execute({ kind: 'surrender' });
				return;
			}
			if (key.name === 'escape') {
				setInteraction({ kind: 'home' });
				setMessage('Back.');
			}
			return;
		}
		if (key.name === 't' && match.activePlayer === localPlayer) {
			if (!canEndTurn(match)) {
				setMessage('Deploy your Monarch before ending the turn.');
				return;
			}
			void execute({ kind: 'end-turn' });
			return;
		}

		if (classShortcut) {
			const number = numberFromKey(key.name);
			if (number !== null) {
				const units = getPlayerUnits(match, match.activePlayer).filter(
					(unit) => unit.kind === classShortcut
				);
				setClassShortcut(null);
				const unit = units[number - 1];
				if (!unit || getDeploymentCells(match, unit.id).length === 0) {
					setMessage('That action is unavailable.');
					return;
				}
				beginUnitSelection(unit, interaction.kind === 'select' ? cursor : undefined);
				return;
			}
			if (key.name === 'escape') {
				setClassShortcut(null);
				setMessage('Back.');
				return;
			}
			setClassShortcut(null);
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
			if (interaction.kind === 'home') {
				setInteraction({ kind: 'select' });
				return;
			}
			setCursor((current) => moveSelection(current, direction, flipped));
			return;
		}

		if (key.name === 'escape') {
			if (interaction.kind === 'target') {
				const unit = getUnit(match, interaction.unitId);
				if (unit?.position) setCursor(unit.position);
				setInteraction({ kind: 'select' });
				setMessage('Back.');
			} else if (interaction.kind !== 'home') {
				setInteraction({ kind: 'home' });
				setMessage('Back.');
			} else if (match.activePlayer === localPlayer) {
				setInteraction({ kind: 'confirm-surrender' });
				setMessage('Surrender the match?');
			}
			return;
		}

		if (match.activePlayer !== localPlayer) return;

		if (interaction.kind === 'deploy' && isConfirmKey(key.name, key.sequence)) {
			if (!boardValid.some((position) => positionsEqual(position, cursor))) {
				setMessage('Choose a highlighted deployment cell.');
				return;
			}
			void execute({ kind: 'deploy', unitId: interaction.unitId, target: cursor });
			return;
		}

		if (interaction.kind === 'target' && isConfirmKey(key.name, key.sequence)) {
			if (!boardValid.some((position) => positionsEqual(position, cursor))) {
				setMessage('That cell is in range, but is not a valid target right now.');
				return;
			}
			void execute({
				kind: 'cast',
				unitId: interaction.unitId,
				spellId: interaction.spellId,
				target: cursor
			});
			return;
		}

		if (interaction.kind === 'deploy' || interaction.kind === 'target') return;

		if (interaction.kind === 'select') {
			const number = numberFromKey(key.name);
			const hoveredUnit = getUnitAt(match, cursor);
			if (number !== null && hoveredUnit?.controller === localPlayer) {
				beginSpell(hoveredUnit.id, number);
				return;
			}
			if (hoveredUnit) return;
		}

		if (key.name === 'x' && interaction.kind === 'home') {
			setInteraction({ kind: 'confirm-surrender' });
			setMessage('Surrender the match?');
			return;
		}

		const classKind = (Object.entries(UNIT_SHORTCUTS) as [UnitKind, string][]).find(
			([, shortcut]) => shortcut === key.name
		)?.[0];
		if (classKind && (interaction.kind === 'home' || interaction.kind === 'select')) {
			beginClassSelection(classKind, interaction.kind === 'select' ? cursor : undefined);
			return;
		}

	});

	const opponent = localPlayer === 'player1' ? 'player2' : 'player1';
	const hoveredUnit = getUnitAt(match, cursor);
	const localUnits = getPlayerUnits(match, localPlayer);
	const unplacedUnits = localUnits.filter((unit) => !unit.position);
	const deployableUnits = unplacedUnits.filter((unit) => getDeploymentCells(match, unit.id).length > 0);
	const deployableUnitIds = new Set(deployableUnits.map((unit) => unit.id));
	const showEndTurn = match.status.kind === 'active' && match.activePlayer === localPlayer;
	const canLocalSurrender = match.activePlayer === localPlayer;
	let infoLines: StyledText[];

	if (match.status.kind === 'won') {
		infoLines = [
			new StyledText([bold(fg(GOLD)('VICTORY'))]),
			new StyledText([fg(WHITE)(`${match.players[match.status.winner].name} wins.`)]),
			new StyledText([dim(`By ${match.status.reason}.`)]),
			new StyledText([bold(fg(GOLD)('[R] Play again')), dim('  [Q] Quit')])
		];
	} else if (busy) {
		const selectedCellInfo = selectedPosition ? cellInfoLine(match, selectedPosition, localPlayer) : null;
		infoLines = [
			new StyledText([bold(fg(GOLD)('RESOLVING…'))]),
			...(selectedCellInfo ? [selectedCellInfo] : []),
			new StyledText([dim(message)])
		];
	} else if (interaction.kind === 'confirm-surrender') {
		infoLines = withFooter(
			surrenderBox(),
			{ ok: true, cancel: true }
		);
	} else if (interaction.kind === 'deploy') {
		const unit = getUnit(match, interaction.unitId)!;
		const selectedCellInfo = cellInfoLine(match, cursor, localPlayer);
		infoLines = withFooter([
			new StyledText([
				bold(fg(ALLY)(`DEPLOY ${UNIT_DEFINITIONS[unit.kind].name.toUpperCase()}`)),
				dim(`  1✦  ·  ${boardAction.valid.length} valid`)
			]),
			...(selectedCellInfo ? [selectedCellInfo] : []),
			new StyledText([dim(message)])
		], { ok: true, cancel: true, endTurn: showEndTurn });
		} else if (interaction.kind === 'target') {
			const unit = getUnit(match, interaction.unitId)!;
			const spell = getSpell(unit, interaction.spellId)!;
			const selectedCellInfo = plainCellInfoLine(match, cursor, localPlayer);
			infoLines = withFooter([
				...spellDefinitionBox(match, unit, spell),
				...(selectedCellInfo ? [selectedCellInfo] : [])
			], {
				ok: targetSpellInputAvailable,
				cancel: true,
				endTurn: showEndTurn
			});
	} else if (interaction.kind === 'select') {
		if (hoveredUnit) {
			infoLines = withFooter(
				unitDetailBox(match, hoveredUnit, cursor, localPlayer),
				{ cancel: true, endTurn: showEndTurn }
			);
		} else {
			infoLines = withFooter(
				placementBox(unplacedUnits, localUnits, deployableUnitIds),
				{ cancel: true, endTurn: showEndTurn }
			);
		}
	} else {
		infoLines = withFooter(
			placementBox(unplacedUnits, localUnits, deployableUnitIds),
			{ surrender: canLocalSurrender, endTurn: showEndTurn }
		);
	}

	const previewUnit =
		interaction.kind === 'deploy' &&
		boardValid.some((position) => positionsEqual(position, cursor))
			? {
				kind: getUnit(match, interaction.unitId)!.kind,
				hp: UNIT_DEFINITIONS[getUnit(match, interaction.unitId)!.kind].maxHp,
				position: cursor,
				side: 'allied' as const
			}
			: null;

	return (
		<box
			style={{
				flexDirection: 'column',
				height: '100%',
				width: '100%',
				paddingTop: 3,
				paddingLeft: 3
			}}
		>
			{playerStatusBar('Opponent', match.players[opponent].energy, match.activePlayer === opponent).map((line, index) => (
				<text key={`opponent-status-${index}`} content={line} />
			))}
			<Board
				units={boardUnits}
				selectedPosition={selectedPosition}
				rangePositions={boardRange}
				validPositions={boardValid}
				flipped={flipped}
				previewUnit={previewUnit}
			/>
			{playerStatusBar('You', match.players[localPlayer].energy, match.activePlayer === localPlayer).map((line, index) => (
				<text key={`you-status-${index}`} content={line} />
			))}
			{infoLines.map((line, index) => <text key={`info-${index}`} content={indentInfoLine(line)} />)}
		</box>
	);
}
