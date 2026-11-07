// Quick static capture of selected slides at 1920x1080 -> shots/one_NN.png
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const root = process.argv[2], list = (process.argv[3] || '1').split(',').map(Number);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(pathToFileURL(root + '/deck/index.html').href + '?static');
for (const n of list) { await p.evaluate(n => window.__go(n), n); await p.waitForFunction(() => window.__ready === true);
  await p.screenshot({ path: `${root}/shots/one_${String(n).padStart(2, '0')}.png` }); }
if (errs.length) console.log(errs.join('\n'));
await b.close();
