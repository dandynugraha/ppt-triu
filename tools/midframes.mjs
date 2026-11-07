// Static captures of in-between positions (pos = k + m) to review travel frames.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const root = process.argv[2], list = process.argv.slice(3).map(Number);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(pathToFileURL(root + '/deck/index.html').href + '?static#1');
await p.evaluate(() => window.__go(1)); await p.waitForFunction(() => window.__ready === true);
await p.addStyleTag({ content: '#slides{opacity:0}' });
for (const pos of list) { await p.evaluate(pos => window.ART.render(pos, 0, 1), pos); await p.screenshot({ path: `${root}/shots/mid_${pos}.png` }); }
await b.close();
