import sys, numpy as np
from PIL import Image
def km(px,k=6,it=25,seed=0):
    rng=np.random.default_rng(seed); c=px[rng.choice(len(px),k,replace=False)]
    for _ in range(it):
        d=((px[:,None,:]-c[None])**2).sum(-1); l=d.argmin(1)
        c=np.array([px[l==i].mean(0) if (l==i).any() else c[i] for i in range(k)])
    return c,np.bincount(l,minlength=k)/len(l)
for p in sys.argv[1:]:
    im=Image.open(p).convert("RGB"); w,h=im.size
    a=np.asarray(im).reshape(-1,3).astype(float)
    # drop the dark pinterest frame around ref A
    a=a[(a.sum(1)>60)]
    a=a[np.random.default_rng(1).choice(len(a),min(60000,len(a)),replace=False)]
    for k in (6,10):
        c,s=km(a,k)
        o=np.argsort(-s)
        print(p,"k=",k)
        for i in o:
            if s[i]>0.03: print("   #%02X%02X%02X  %.1f%%"%(*c[i].astype(int),s[i]*100))
