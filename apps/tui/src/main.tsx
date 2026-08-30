#!/usr/bin/env bun

import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { OnlineApp } from './OnlineApp.tsx';

const renderer = await createCliRenderer({
	exitOnCtrlC: true
});

const convexUrl = process.env.PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;

createRoot(renderer).render(<OnlineApp convexUrl={convexUrl} />);
