// Screenshots at a typical laptop size (1366x768, DPR 1.25) to judge legibility of the art.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const root = process.argv[2], tag = process.argv[3] || 'now', list = (process.argv[4] || '1,3,7,9').split(',').map(Number);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1.25 });
await p.goto(pathToFileURL(root + '/deck/index.html').href + '?static');
for (const n of list) { await p.evaluate(n => window.__go(n), n); await p.waitForFunction(() => window.__ready === true);
  await p.screenshot({ path: `${root}/shots/laptop_${tag}_${n}.png` }); }
await b.close();
