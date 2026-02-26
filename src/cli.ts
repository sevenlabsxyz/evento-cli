#!/usr/bin/env node

import { runCli } from './index.js';

const argv = process.argv.slice(2);
const code = await runCli(argv);
process.exitCode = code;
