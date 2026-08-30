import {
	BOARD_SIZE,
	UNIT_SYMBOLS,
	boardPositionKey,
	type BoardUnit,
	type BoardPosition,
	type UnitSide
} from '@stm/game';
import { StyledText, bold, fg, underline } from '@opentui/core';

const FILE_LABELS = 'ABCDEFGH';
const BORDER_COLOR = '#6e6a86';
const HIGHLIGHT_BORDER_COLOR = '#f6c177';
const ALLIED_COLOR = '#9ccfd8';
const ENEMY_COLOR = '#eb6f92';
const SUBSCRIPT_DIGITS = ['', '₁', '₂', '₃', '₄', '₅'] as const;

type BoardProps = {
	units: readonly BoardUnit[];
	selectedPosition?: BoardPosition | null;
};

type SelectedEdge = 'top' | 'bottom';

type BoardLine = {
	key: string;
	content: StyledText;
};

function unitColor(side: UnitSide): string {
	return side === 'allied' ? ALLIED_COLOR : ENEMY_COLOR;
}

function selectedCorner(
	boundary: number,
	selectedFile: number | null,
	selectedEdge: SelectedEdge | null
): string | null {
	if (selectedFile === null || selectedEdge === null) {
		return null;
	}

	if (boundary === selectedFile) {
		return selectedEdge === 'top' ? '╔' : '╚';
	}

	if (boundary === selectedFile + 1) {
		return selectedEdge === 'top' ? '╗' : '╝';
	}

	return null;
}

function createTopLabels(selectedPosition: BoardPosition | null): StyledText {
	const chunks = [fg(BORDER_COLOR)('    ')];

	for (let file = 0; file < BOARD_SIZE; file += 1) {
		chunks.push(
			fg(file === selectedPosition?.file ? HIGHLIGHT_BORDER_COLOR : BORDER_COLOR)(
				FILE_LABELS[file]
			)
		);
		if (file < BOARD_SIZE - 1) {
			chunks.push(fg(BORDER_COLOR)('   '));
		}
	}

	return new StyledText(chunks);
}

function createBoardRow(
	rank: number,
	unitsByPosition: ReadonlyMap<string, BoardUnit>,
	selectedPosition: BoardPosition | null
): StyledText {
	const firstEdgeSelected = selectedPosition?.file === 0 && selectedPosition.rank === rank;
	const chunks = [
		fg(selectedPosition?.rank === rank ? HIGHLIGHT_BORDER_COLOR : BORDER_COLOR)(
			`${rank + 1}`
		),
		fg(BORDER_COLOR)(' '),
		firstEdgeSelected ? fg(HIGHLIGHT_BORDER_COLOR)('║') : fg(BORDER_COLOR)('│')
	];

	for (let file = 0; file < BOARD_SIZE; file += 1) {
		const selected = selectedPosition?.file === file && selectedPosition.rank === rank;
		const unit = unitsByPosition.get(boardPositionKey({ file, rank }));
		if (!unit) {
			chunks.push(fg(BORDER_COLOR)('   '));
		} else {
			const foreground = unitColor(unit.side);
			const symbol = UNIT_SYMBOLS[unit.kind];
			chunks.push(bold(fg(foreground)(' ')));
			chunks.push(
				bold(
					unit.kind === 'monarch'
						? underline(fg(foreground)(symbol))
						: fg(foreground)(symbol)
				)
			);
			chunks.push(bold(fg(foreground)(' ')));
		}
		const nextEdgeSelected = selectedPosition?.file === file + 1 && selectedPosition.rank === rank;
		chunks.push(
			selected || nextEdgeSelected
				? fg(HIGHLIGHT_BORDER_COLOR)('║')
				: fg(BORDER_COLOR)('│')
		);
	}

	return new StyledText(chunks);
}

function createTopBorder(
	unitsByPosition: ReadonlyMap<string, BoardUnit>,
	selectedPosition: BoardPosition | null
): StyledText {
	const selectedFile =
		selectedPosition?.rank === BOARD_SIZE - 1 ? selectedPosition.file : null;
	const startCorner = selectedCorner(0, selectedFile, 'top');
	const chunks = [
		fg(BORDER_COLOR)('  '),
		fg(startCorner ? HIGHLIGHT_BORDER_COLOR : BORDER_COLOR)(startCorner ?? '┌')
	];

	for (let file = 0; file < BOARD_SIZE; file += 1) {
		const unit = unitsByPosition.get(
			boardPositionKey({ file, rank: BOARD_SIZE - 1 })
		);
		const selected = selectedPosition?.file === file && selectedPosition.rank === BOARD_SIZE - 1;
		if (unit?.displayNumber) {
			const subscript = SUBSCRIPT_DIGITS[unit.displayNumber];
			chunks.push(selected ? fg(HIGHLIGHT_BORDER_COLOR)('═') : fg(BORDER_COLOR)('─'));
			chunks.push(fg(unitColor(unit.side))(subscript));
			chunks.push(selected ? fg(HIGHLIGHT_BORDER_COLOR)('═') : fg(BORDER_COLOR)('─'));
		} else {
			chunks.push(selected ? fg(HIGHLIGHT_BORDER_COLOR)('═══') : fg(BORDER_COLOR)('───'));
		}

		const boundary = file + 1;
		const corner = selectedCorner(boundary, selectedFile, 'top');
		const junction = boundary === BOARD_SIZE ? '┐' : '┬';
		chunks.push(
			fg(corner ? HIGHLIGHT_BORDER_COLOR : BORDER_COLOR)(corner ?? junction)
		);
	}

	return new StyledText(chunks);
}

function createBottomBorder(
	rank: number,
	unitsByPosition: ReadonlyMap<string, BoardUnit>,
	isFinal: boolean,
	selectedPosition: BoardPosition | null
): StyledText {
	let selectedEdge: SelectedEdge | null = null;
	let selectedFile: number | null = null;
	if (selectedPosition?.rank === rank) {
		selectedEdge = 'bottom';
		selectedFile = selectedPosition.file;
	} else if (selectedPosition?.rank === rank - 1) {
		selectedEdge = 'top';
		selectedFile = selectedPosition.file;
	}

	const startCorner = selectedCorner(0, selectedFile, selectedEdge);
	const chunks = [
		fg(BORDER_COLOR)('  '),
		fg(startCorner ? HIGHLIGHT_BORDER_COLOR : BORDER_COLOR)(
			startCorner ?? (isFinal ? '└' : '├')
		)
	];

	for (let file = 0; file < BOARD_SIZE; file += 1) {
		const unit = isFinal
			? undefined
			: unitsByPosition.get(boardPositionKey({ file, rank: rank - 1 }));
		const selected =
			selectedPosition?.file === file &&
			(selectedPosition.rank === rank || selectedPosition.rank === rank - 1);
		if (unit?.displayNumber) {
			const subscript = SUBSCRIPT_DIGITS[unit.displayNumber];
			chunks.push(selected ? fg(HIGHLIGHT_BORDER_COLOR)('═') : fg(BORDER_COLOR)('─'));
			chunks.push(fg(unitColor(unit.side))(subscript));
			chunks.push(selected ? fg(HIGHLIGHT_BORDER_COLOR)('═') : fg(BORDER_COLOR)('─'));
		} else {
			chunks.push(selected ? fg(HIGHLIGHT_BORDER_COLOR)('═══') : fg(BORDER_COLOR)('───'));
		}

		const boundary = file + 1;
		const corner = selectedCorner(boundary, selectedFile, selectedEdge);
		const junction = boundary === BOARD_SIZE ? (isFinal ? '┘' : '┤') : isFinal ? '┴' : '┼';
		chunks.push(
			fg(corner ? HIGHLIGHT_BORDER_COLOR : BORDER_COLOR)(corner ?? junction)
		);
	}

	return new StyledText(chunks);
}

function createBoardLines(
	units: readonly BoardUnit[],
	selectedPosition: BoardPosition | null
): BoardLine[] {
	const unitsByPosition = new Map(
		units.map((unit) => [boardPositionKey(unit.position), unit] as const)
	);
	const ranks = Array.from({ length: BOARD_SIZE }, (_, index) => BOARD_SIZE - index - 1);

	return [
		{ key: 'labels', content: createTopLabels(selectedPosition) },
		{ key: 'top-border', content: createTopBorder(unitsByPosition, selectedPosition) },
		...ranks.flatMap((rank, index) => [
			{
				key: `${rank}-row`,
				content: createBoardRow(rank, unitsByPosition, selectedPosition)
			},
			{
				key: `${rank}-border`,
				content: createBottomBorder(
					rank,
					unitsByPosition,
					index === ranks.length - 1,
					selectedPosition
				)
			}
		])
	];
}

export function createBoardText(
	units: readonly BoardUnit[],
	selectedPosition: BoardPosition | null = null
): string {
	return createBoardLines(units, selectedPosition)
		.map(({ content }) => content.chunks.map((chunk) => chunk.text).join(''))
		.join('\n');
}

export function Board({ units, selectedPosition = null }: BoardProps) {
	const lines = createBoardLines(units, selectedPosition);

	return (
		<box style={{ flexDirection: 'column', height: 18, width: 35 }}>
			{lines.map((line) => (
				<text key={line.key} content={line.content} />
			))}
		</box>
	);
}
