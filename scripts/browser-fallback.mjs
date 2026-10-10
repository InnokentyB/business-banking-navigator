// Optional Linux-only browser for environments where the Playwright CDN is inaccessible.
// Installs a pinned package into a temporary directory; never modifies project dependencies.
import { mkdtemp, readFile, writeFile, chmod, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { brotliDecompressSync } from 'node:zlib';
if (process.platform !== 'linux' || process.arch !== 'x64') {
  console.error('This fallback is Linux x64 only. Use npx playwright install chromium on your platform.');
  process.exit(2);
}
const folder=await mkdtemp(join(tmpdir(),'bbn-chromium-'));
const packed=JSON.parse(execFileSync('npm',['pack','@sparticuz/chromium@153.0.0','--json','--pack-destination',folder],{encoding:'utf8'}));
execFileSync('tar',['-xzf',join(folder,packed[0].filename),'-C',folder]);
const binary=join(folder,'chromium');
await writeFile(binary,brotliDecompressSync(await readFile(join(folder,'package/bin/chromium.br'))));
await chmod(binary,0o700);
console.log(`BROWSER_EXECUTABLE=${binary} npm run test:browser`);
