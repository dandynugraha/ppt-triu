import json, re, sys
from PIL import Image
import numpy as np
def lum(rgb):
    c = rgb/255.0; c = np.where(c <= .03928, c/12.92, ((c+.055)/1.055)**2.4); return .2126*c[...,0]+.7152*c[...,1]+.0722*c[...,2]
boxes = json.load(open('shots/tc/boxes.json')); worst = []; fails = 0
for k, items in boxes.items():
    bg = np.asarray(Image.open(f'shots/tc/{int(k):02d}_bg.png').convert('RGB')).astype(float)
    L = lum(bg)
    for it in items:
        x0, y0 = max(0, int(it['x'])), max(0, int(it['y'])); x1, y1 = min(1920, int(it['x']+it['w'])), min(1080, int(it['y']+it['h']))
        if x1 <= x0 or y1 <= y0: continue
        lb = np.percentile(L[y0:y1, x0:x1], 99)
        m = re.findall(r'[\d.]+', it['color']); lt = lum(np.array([float(m[0]), float(m[1]), float(m[2])]))
        cr = (max(lt, lb)+.05)/(min(lt, lb)+.05)
        worst.append((cr, k, it['text']))
        if cr < 7: fails += 1
worst.sort()
for w in worst[:6]: print('%.2f  slide %s  %s' % w)
print('text runs:', len(worst), ' below 7:1:', fails)
sys.exit(1 if fails else 0)
