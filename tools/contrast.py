def L(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b):
    la,lb=sorted([L(a),L(b)],reverse=True); return (la+0.05)/(lb+0.05)
pairs=[("#1C202B","#FFFFFF"),("#1C202B","#F8F9FB"),("#1C202B","#EFEEF8"),("#555B76","#FFFFFF"),("#555B76","#F8F9FB"),
("#3D3CD3","#FFFFFF"),("#3D3CD3","#F8F9FB"),("#3D3CD3","#EFEEF8"),("#1C202B","#D9FA3F"),("#FFFFFF","#3D3CD3"),("#FFFFFF","#5A7AF3"),("#FFFFFF","#2E2DB8"),("#2E2DB8","#FFFFFF"),("#2E2DB8","#F8F9FB"),("#4A4F6B","#FFFFFF"),("#4A4F6B","#F8F9FB"),("#4A4F6B","#EFEEF8"),("#FFFFFF","#1C202B"),("#E8EBF4","#2E2DB8")]
for a,b in pairs: print(a,"on",b,"%.2f"%cr(a,b))
