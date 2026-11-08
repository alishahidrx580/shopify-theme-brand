import json, io, glob, os, statistics as st


def row(p):
    d = json.load(io.open(p, encoding='utf-8'))
    a = d['audits']
    mw = {(i.get('groupLabel') or i.get('group')): int(i.get('duration') or 0)
          for i in a['mainthread-work-breakdown']['details']['items']}
    reqs = a['network-requests']['details']['items']
    return dict(
        score=round((d['categories']['performance']['score'] or 0) * 100),
        tbt=int(a['total-blocking-time']['numericValue']),
        fcp=int(a['first-contentful-paint']['numericValue']),
        lcp=int(a['largest-contentful-paint']['numericValue']),
        tti=int(a['interactive']['numericValue']),
        sl=mw.get('Style & Layout', 0),
        sc=mw.get('Script Evaluation', 0),
        req=len(reqs),
        jm=sum(1 for r in reqs if 'judgeme' in r['url'] or 'judge.me' in r['url']),
    )


def load(folder):
    arms = {}
    for p in sorted(glob.glob(os.path.join(folder, '*-?.json'))):
        arm = os.path.basename(p).split('-')[0]
        arms.setdefault(arm, []).append(row(p))
    return arms


def med(rs, k):
    return int(st.median([r[k] for r in rs]))


here = os.path.dirname(os.path.abspath(__file__))
ab3 = load(here)
ab2 = load(os.path.join(here, '..', 'ab2'))

print('SECOND RUN (timer fallback removed)')
print('%-6s %2s %-5s %-6s %-6s %-6s %-6s %-6s %-6s %-5s %-4s' %
      ('arm', 'n', 'score', 'TBT', 'FCP', 'LCP', 'TTI', 'S&L', 'Script', 'reqs', 'jm'))
for a, rs in ab3.items():
    print('%-6s %2d %-5d %-6d %-6d %-6d %-6d %-6d %-6d %-5d %-4d' % (
        a, len(rs), med(rs, 'score'), med(rs, 'tbt'), med(rs, 'fcp'), med(rs, 'lcp'),
        med(rs, 'tti'), med(rs, 'sl'), med(rs, 'sc'), med(rs, 'req'), med(rs, 'jm')))
print()
for a, rs in ab3.items():
    print(a, 'score', [r['score'] for r in rs], 'TBT', [r['tbt'] for r in rs],
          'TTI', [r['tti'] for r in rs], 'S&L', [r['sl'] for r in rs])

print('\nPOOLED: first run (with 15s timer) + second run = 8 per arm')
for a in ab3:
    rs = ab2.get(a, []) + ab3[a]
    print('%-6s n=%d  score %d  TBT %d  S&L %d  Script %d  reqs %d' % (
        a, len(rs), med(rs, 'score'), med(rs, 'tbt'), med(rs, 'sl'), med(rs, 'sc'), med(rs, 'req')))
