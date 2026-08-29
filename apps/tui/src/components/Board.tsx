import {
	BOARD_SIZE,
	UNIT_SYMBOLS,
	boardPositionKey,
	type BoardUnit,
	type UnitSide
} from '@stm/game';
import { StyledText, bold, fg, underline } from '@opentui/core';

const FILE_LABELS = 'ABCDEFGH';
const BORDER_COLOR = '#6e6a86';
const ALLIED_COLOR = '#9ccfd8';
const ENEMY_COLOR = '#eb6f92';
const SUPERSCRIPT_DIGITS = ['', '¹', '²', '³', '⁴', '⁵'] as const;

const TOP_LABELS = `    ${FILE_LABELS.split('').join('   ')}`;
const TOP_BORDER = `  ┌${Array.from({ length: BOARD_SIZE }, () => '───').join('┬')}┐`;

type BoardProps = {
	units: readonly BoardUnit[];
};

function unitColor(side: UnitSide): string {
	return side === 'allied' ? ALLIED_COLOR : ENEMY_COLOR;
}

function createBoardRow(rank: number, unitsByPosition: ReadonlyMap<string, BoardUnit>): StyledText {
	const chunks = [fg(BORDER_COLOR)(`${rank + 1} │`)];

	for (let file = 0; file < BOARD_SIZE; file += 1) {
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
		chunks.push(fg(BORDER_COLOR)('│'));
	}

	return new StyledText(chunks);
}

function createBottomBorder(
	rank: number,
	unitsByPosition: ReadonlyMap<string, BoardUnit>,
	isFinal: boolean
): StyledText {
	const chunks = [fg(BORDER_COLOR)(isFinal ? '  └' : '  ├')];

	for (let file = 0; file < BOARD_SIZE; file += 1) {
		const unit = unitsByPosition.get(boardPositionKey({ file, rank }));
		if (unit?.displayNumber) {
			const superscript = SUPERSCRIPT_DIGITS[unit.displayNumber];
			chunks.push(fg(BORDER_COLOR)('─'));
			chunks.push(fg(unitColor(unit.side))(superscript));
			chunks.push(fg(BORDER_COLOR)('─'));
		} else {
			chunks.push(fg(BORDER_COLOR)('───'));
		}
		if (file < BOARD_SIZE - 1) {
			chunks.push(fg(BORDER_COLOR)(isFinal ? '┴' : '┼'));
		}
	}

	chunks.push(fg(BORDER_COLOR)(isFinal ? '┘' : '┤'));
	return new StyledText(chunks);
}

export function Board({ units }: BoardProps) {
	const unitsByPosition = new Map(
		units.map((unit) => [boardPositionKey(unit.position), unit] as const)
	);
	const ranks = Array.from({ length: BOARD_SIZE }, (_, index) => BOARD_SIZE - index - 1);

	return (
		<box style={{ flexDirection: 'column', height: 18, width: 35 }}>
			<text fg={BORDER_COLOR}>{TOP_LABELS}</text>
			<text fg={BORDER_COLOR}>{TOP_BORDER}</text>
			{ranks.flatMap((rank, index) => [
				<text key={`${rank}-row`} content={createBoardRow(rank, unitsByPosition)} />,
				<text
					key={`${rank}-border`}
					content={createBottomBorder(rank, unitsByPosition, index === ranks.length - 1)}
				/>
			])}
		</box>
	);
}
