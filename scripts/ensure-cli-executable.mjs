import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const cliPath = join(process.cwd(), 'dist', 'cli.js');

const content = await readFile(cliPath, 'utf8');
if (!content.startsWith('#!/usr/bin/env node')) {
  await writeFile(cliPath, `#!/usr/bin/env node\n${content}`, 'utf8');
}

await chmod(cliPath, 0o755);
