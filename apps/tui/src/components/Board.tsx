import {
	BOARD_SIZE,
	UNIT_SYMBOLS,
	boardPositionKey,
	type BoardUnit,
	type BoardPosition,
	type UnitSide
} from '@stm/game';
import { StyledText, bold, fg, underline } from '@opentui/core';

const BORDER_COLOR = 'gray';
const LEGEND_HIGHLIGHT_COLOR = 'white';
const ALLIED_COLOR = 'cyan';
const ENEMY_COLOR = 'red';
const PREVIEW_COLOR = 'gray';
const RANGE_PATTERN = '░';
const VALID_PATTERN = '▒';
const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'] as const;
const SUPERSCRIPT_DIGITS = ['', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸'] as const;
const SMALL_FILE_LABELS = ['ᴀ', 'ʙ', 'ᴄ', 'ᴅ', 'ᴇ', 'ꜰ', 'ɢ', 'ʜ'] as const;

type BoardProps = {
	units: readonly BoardUnit[];
	selectedPosition: BoardPosition | null;
	rangePositions: readonly BoardPosition[];
	validPositions: readonly BoardPosition[];
	flipped: boolean;
	previewUnit?: BoardUnit | null;
};

type SelectedEdge = 'top' | 'bottom';

type BoardLine = {
	key: string;
	content: StyledText;
};

function unitColor(side: UnitSide): string {
	return side === 'allied' ? ALLIED_COLOR : ENEMY_COLOR;
}

function cellPattern(
	key: string | null,
	rangePositions: ReadonlySet<string>,
	validPositions: ReadonlySet<string>
): string {
	if (key !== null && validPositions.has(key)) return VALID_PATTERN;
	if (key !== null && rangePositions.has(key)) return RANGE_PATTERN;
	return ' ';
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

function createTopLabels(selectedPosition: BoardPosition | null, files: readonly number[]): StyledText {
	const chunks = [fg(BORDER_COLOR)('    ')];

	for (const [index, file] of files.entries()) {
		chunks.push(
			fg(file === selectedPosition?.file ? LEGEND_HIGHLIGHT_COLOR : BORDER_COLOR)(
				SMALL_FILE_LABELS[file]
			)
		);
		if (index < BOARD_SIZE - 1) {
			chunks.push(fg(BORDER_COLOR)('   '));
		}
	}

	return new StyledText(chunks);
}

function createBottomLabels(selectedPosition: BoardPosition | null, files: readonly number[]): StyledText {
	const chunks = [fg(BORDER_COLOR)('    ')];

	for (const [index, file] of files.entries()) {
		chunks.push(
			fg(file === selectedPosition?.file ? LEGEND_HIGHLIGHT_COLOR : BORDER_COLOR)(
				SMALL_FILE_LABELS[file]
			)
		);
		if (index < BOARD_SIZE - 1) {
			chunks.push(fg(BORDER_COLOR)('   '));
		}
	}

	return new StyledText(chunks);
}

function createBoardRow(
	rank: number,
	files: readonly number[],
	unitsByPosition: ReadonlyMap<string, BoardUnit>,
	selectedPosition: BoardPosition | null,
	rangePositions: ReadonlySet<string>,
	validPositions: ReadonlySet<string>,
	previewUnit: BoardUnit | null
): StyledText {
	const chunks = [
		fg(selectedPosition?.rank === rank ? LEGEND_HIGHLIGHT_COLOR : BORDER_COLOR)(
			SUPERSCRIPT_DIGITS[rank + 1]!
		),
		fg(BORDER_COLOR)(' '),
		fg(BORDER_COLOR)('│')
	];

	for (const file of files) {
		const position = { file, rank };
		const key = boardPositionKey(position);
		const pattern = cellPattern(key, rangePositions, validPositions);
		const unit = unitsByPosition.get(key);
		const isPreview = !unit && previewUnit?.position && boardPositionKey(previewUnit.position) === key;
		const displayedUnit = unit ?? (isPreview ? previewUnit : undefined);
		if (!displayedUnit) {
			chunks.push(fg(BORDER_COLOR)(pattern.repeat(3)));
		} else {
			const foreground = isPreview ? PREVIEW_COLOR : unitColor(displayedUnit.side);
			const symbol = UNIT_SYMBOLS[displayedUnit.kind];
			const styled = (text: string) => fg(foreground)(text);
			chunks.push(fg(BORDER_COLOR)(pattern));
			chunks.push(
				bold(
					displayedUnit.kind === 'monarch'
						? underline(styled(symbol))
						: styled(symbol)
					)
			);
			chunks.push(fg(BORDER_COLOR)(pattern));
		}
		chunks.push(fg(BORDER_COLOR)('│'));
	}

	chunks.push(fg(BORDER_COLOR)(' '));
	chunks.push(
		fg(selectedPosition?.rank === rank ? LEGEND_HIGHLIGHT_COLOR : BORDER_COLOR)(
			SUPERSCRIPT_DIGITS[rank + 1]!
		)
	);

	return new StyledText(chunks);
}

function createTopBorder(
	topRank: number,
	files: readonly number[],
	unitsByPosition: ReadonlyMap<string, BoardUnit>,
	selectedPosition: BoardPosition | null,
	validPositions: ReadonlySet<string>,
	cursorValidityActive: boolean,
	previewUnit: BoardUnit | null
): StyledText {
	const selectedFile =
		selectedPosition?.rank === topRank ? files.indexOf(selectedPosition.file) : null;
	const startCorner = selectedCorner(0, selectedFile, 'top');
	const rowBorderColor = BORDER_COLOR;
	const cursorIsValid =
		!cursorValidityActive ||
		(selectedPosition !== null && validPositions.has(boardPositionKey(selectedPosition)));
	const selectedColor = cursorIsValid ? LEGEND_HIGHLIGHT_COLOR : BORDER_COLOR;
	const chunks = [
		fg(BORDER_COLOR)('  '),
		fg(startCorner ? selectedColor : rowBorderColor)(startCorner ?? '┌')
	];

	for (const [index, file] of files.entries()) {
		const key = boardPositionKey({ file, rank: topRank });
		const unit = unitsByPosition.get(key);
		const isPreview = !unit && previewUnit?.position && boardPositionKey(previewUnit.position) === key;
		const displayedUnit = unit ?? (isPreview ? previewUnit : undefined);
		if (displayedUnit) {
			const subscript = SUBSCRIPT_DIGITS[displayedUnit.hp] ?? '?';
			chunks.push(fg(rowBorderColor)('─'));
			chunks.push(fg(isPreview ? PREVIEW_COLOR : unitColor(displayedUnit.side))(subscript));
			chunks.push(fg(rowBorderColor)('─'));
		} else {
			chunks.push(fg(rowBorderColor)('───'));
		}

		const boundary = index + 1;
		const corner = selectedCorner(boundary, selectedFile, 'top');
		const junction = boundary === BOARD_SIZE ? '┐' : '┬';
		chunks.push(
			fg(corner ? selectedColor : rowBorderColor)(corner ?? junction)
		);
	}

	return new StyledText(chunks);
}

function createBottomBorder(
	rank: number,
	nextRank: number | undefined,
	files: readonly number[],
	unitsByPosition: ReadonlyMap<string, BoardUnit>,
	isFinal: boolean,
	selectedPosition: BoardPosition | null,
	validPositions: ReadonlySet<string>,
	cursorValidityActive: boolean,
	previewUnit: BoardUnit | null
): StyledText {
	let selectedEdge: SelectedEdge | null = null;
	let selectedFile: number | null = null;
	if (selectedPosition?.rank === rank) {
		selectedEdge = 'bottom';
		selectedFile = files.indexOf(selectedPosition.file);
	} else if (selectedPosition && selectedPosition.rank === nextRank) {
		selectedEdge = 'top';
		selectedFile = files.indexOf(selectedPosition.file);
	}

	const startCorner = selectedCorner(0, selectedFile, selectedEdge);
	const cursorIsValid =
		!cursorValidityActive ||
		(selectedPosition !== null && validPositions.has(boardPositionKey(selectedPosition)));
	const selectedColor = cursorIsValid ? LEGEND_HIGHLIGHT_COLOR : BORDER_COLOR;
	const chunks = [
		fg(BORDER_COLOR)('  '),
		fg(startCorner ? selectedColor : BORDER_COLOR)(
			startCorner ?? (isFinal ? '└' : '├')
		)
	];

	for (const [index, file] of files.entries()) {
		const key = nextRank === undefined ? null : boardPositionKey({ file, rank: nextRank });
		const unit = nextRank === undefined
			? undefined
			: unitsByPosition.get(key!);
		const isPreview = Boolean(
			!unit && key && previewUnit?.position && boardPositionKey(previewUnit.position) === key
		);
		const displayedUnit = unit ?? (isPreview ? previewUnit : undefined);
		if (displayedUnit) {
			const subscript = SUBSCRIPT_DIGITS[displayedUnit.hp] ?? '?';
			chunks.push(fg(BORDER_COLOR)('─'));
			chunks.push(fg(isPreview ? PREVIEW_COLOR : unitColor(displayedUnit.side))(subscript));
			chunks.push(fg(BORDER_COLOR)('─'));
		} else {
			chunks.push(fg(BORDER_COLOR)('───'));
		}

		const boundary = index + 1;
		const corner = selectedCorner(boundary, selectedFile, selectedEdge);
		const junction = boundary === BOARD_SIZE
			? isFinal ? '┘' : '┤'
			: isFinal ? '┴' : '┼';
		chunks.push(
			fg(corner ? selectedColor : BORDER_COLOR)(corner ?? junction)
		);
	}

	return new StyledText(chunks);
}

function createBoardLines(
	units: readonly BoardUnit[],
	selectedPosition: BoardPosition | null,
	rangePositions: readonly BoardPosition[],
	validPositions: readonly BoardPosition[],
	previewUnit: BoardUnit | null,
	flipped: boolean
): BoardLine[] {
	const unitsByPosition = new Map(
		units.map((unit) => [boardPositionKey(unit.position), unit] as const)
	);
	const files = Array.from({ length: BOARD_SIZE }, (_, index) => (flipped ? BOARD_SIZE - index - 1 : index));
	const ranks = Array.from({ length: BOARD_SIZE }, (_, index) => (flipped ? index : BOARD_SIZE - index - 1));
	const rangeKeys = new Set(rangePositions.map(boardPositionKey));
	const validKeys = new Set(validPositions.map(boardPositionKey));
	const cursorValidityActive = validPositions.length > 0 || rangePositions.length > 0;

	return [
		{ key: 'labels', content: createTopLabels(selectedPosition, files) },
		{ key: 'top-border', content: createTopBorder(ranks[0]!, files, unitsByPosition, selectedPosition, validKeys, cursorValidityActive, previewUnit) },
		...ranks.flatMap((rank, index) => [
			{
				key: `${rank}-row`,
				content: createBoardRow(rank, files, unitsByPosition, selectedPosition, rangeKeys, validKeys, previewUnit)
			},
			{
				key: `${rank}-border`,
					content: createBottomBorder(
						rank,
						ranks[index + 1],
						files,
						unitsByPosition,
					index === ranks.length - 1,
						selectedPosition,
						validKeys,
						cursorValidityActive,
						previewUnit
					)
			}
		]),
		{ key: 'bottom-labels', content: createBottomLabels(selectedPosition, files) }
	];
}

export function createBoardText(
	units: readonly BoardUnit[],
	selectedPosition: BoardPosition | null,
	rangePositions: readonly BoardPosition[],
	validPositions: readonly BoardPosition[],
	flipped: boolean,
	previewUnit: BoardUnit | null = null
): string {
	return createBoardLines(units, selectedPosition, rangePositions, validPositions, previewUnit, flipped)
		.map(({ content }) => content.chunks.map((chunk) => chunk.text).join(''))
		.join('\n');
}

export function Board({ units, selectedPosition, rangePositions, validPositions, flipped, previewUnit = null }: BoardProps) {
	const lines = createBoardLines(units, selectedPosition, rangePositions, validPositions, previewUnit, flipped);

	return (
		<box style={{ flexDirection: 'column', height: 19, width: 37 }}>
			{lines.map((line) => (
				<text key={line.key} content={line.content} />
			))}
		</box>
	);
}
