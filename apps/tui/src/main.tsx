#!/usr/bin/env bun

import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { DEPLOYED_CONVEX_URL } from './deployment.ts';
import { getOrCreatePlayerToken } from './identity.ts';
import { OnlineApp } from './OnlineApp.tsx';

const [renderer, playerToken] = await Promise.all([
	createCliRenderer({
		exitOnCtrlC: true
	}),
	getOrCreatePlayerToken()
]);

const convexUrl = process.env.PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? DEPLOYED_CONVEX_URL;

createRoot(renderer).render(<OnlineApp convexUrl={convexUrl} playerToken={playerToken} />);
