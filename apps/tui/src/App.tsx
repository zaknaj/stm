import { useKeyboard, useRenderer } from '@opentui/react';
import { Board } from './components/Board.tsx';
import { DEMO_UNITS } from './demoPosition.ts';

export function App() {
	const renderer = useRenderer();

	useKeyboard((key) => {
		if (key.name === 'escape' || key.name === 'q') {
			renderer.destroy();
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
			<Board units={DEMO_UNITS} />
		</box>
	);
}
