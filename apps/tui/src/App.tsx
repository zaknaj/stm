import { useKeyboard, useRenderer } from '@opentui/react';
import { useState } from 'react';
import { Board } from './components/Board.tsx';
import { DEMO_UNITS } from './demoPosition.ts';
import { moveSelection, type NavigationDirection } from './navigation.ts';

export function App() {
	const renderer = useRenderer();
	const [selectedPosition, setSelectedPosition] = useState<ReturnType<typeof moveSelection> | null>(null);

	useKeyboard((key) => {
		if (key.name === 'q') {
			renderer.destroy();
			return;
		}

		if (key.name === 'escape') {
			setSelectedPosition(null);
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
			setSelectedPosition((current) => moveSelection(current, direction));
		}
	});

	return (
		<box
			style={{
				alignItems: 'center',
				height: '100%',
				justifyContent: 'flex-start',
				width: '100%'
			}}
		>
			<Board units={DEMO_UNITS} selectedPosition={selectedPosition} />
		</box>
	);
}
