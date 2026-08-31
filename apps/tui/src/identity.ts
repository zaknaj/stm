import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_ROOT = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), '.config');
const CONFIG_DIRECTORY = join(CONFIG_ROOT, 'stm');
const IDENTITY_FILE = join(CONFIG_DIRECTORY, 'player-token');

export async function getOrCreatePlayerToken(): Promise<string> {
	try {
		const existing = (await readFile(IDENTITY_FILE, 'utf8')).trim();
		if (existing) return existing;
	} catch (error) {
		if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
	}

	const playerToken = crypto.randomUUID();
	await mkdir(CONFIG_DIRECTORY, { recursive: true, mode: 0o700 });
	await writeFile(IDENTITY_FILE, `${playerToken}\n`, { mode: 0o600, flag: 'wx' }).catch(
		async (error: unknown) => {
			if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
		}
	);

	return (await readFile(IDENTITY_FILE, 'utf8')).trim();
}
