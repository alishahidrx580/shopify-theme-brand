"""Before vs now on the CHAM mask page, in seconds.

BEFORE = live runs taken earlier today, before the Judge.me guard and the
html:has() fix went live (ab/base, ab2/live, ab3/live).
NOW    = fresh live runs in ab5/now-*.json.
Mobile, simulated slow 4G and 4x CPU slowdown. Medians; min/max shown.
"""
import glob
import io
import json
import os
import statistics as st

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, '..')


def row(p):
    d = json.load(io.open(p, encoding='utf-8'))
    a = d['audits']
    mw = {(i.get('groupLabel') or i.get('group')): i.get('duration') or 0
          for i in a['mainthread-work-breakdown']['details']['items']}
    reqs = a['network-requests']['details']['items']
    nav = [r for r in reqs if r.get('resourceType') == 'Document']
    return dict(
        score=(d['categories']['performance']['score'] or 0) * 100,
        fcp=a['first-contentful-paint']['numericValue'] / 1000,
        lcp=a['largest-contentful-paint']['numericValue'] / 1000,
        si=a['speed-index']['numericValue'] / 1000,
        tbt=a['total-blocking-time']['numericValue'] / 1000,
        tti=a['interactive']['numericValue'] / 1000,
        sl=mw.get('Style & Layout', 0) / 1000,
        sc=mw.get('Script Evaluation', 0) / 1000,
        main=sum(mw.values()) / 1000,
        req=len(reqs),
        kb=sum(r.get('transferSize') or 0 for r in reqs) / 1024,
    )


before_files = (sorted(glob.glob(os.path.join(root, 'ab', 'base-?.json'))) +
                sorted(glob.glob(os.path.join(root, 'ab2', 'live-?.json'))) +
                sorted(glob.glob(os.path.join(root, 'ab3', 'live-?.json'))))
now_files = sorted(glob.glob(os.path.join(here, 'now-?.json')))
B = [row(p) for p in before_files]
N = [row(p) for p in now_files]

rows = [
    ('Total Blocking Time', 'tbt', 's'),
    ('Style & Layout work', 'sl', 's'),
    ('Script evaluation', 'sc', 's'),
    ('All main-thread work', 'main', 's'),
    ('First Contentful Paint', 'fcp', 's'),
    ('Largest Contentful Paint', 'lcp', 's'),
    ('Speed Index', 'si', 's'),
    ('Time to Interactive', 'tti', 's'),
    ('Requests', 'req', ''),
    ('Page weight', 'kb', 'KB'),
    ('Performance score', 'score', ''),
]
print('runs: before=%d  now=%d\n' % (len(B), len(N)))
print('%-26s %9s %9s %9s   %-19s %-19s' % ('', 'before', 'now', 'change', 'before min-max', 'now min-max'))
for label, k, unit in rows:
    b = st.median([r[k] for r in B])
    n = st.median([r[k] for r in N])
    bl, bh = min(r[k] for r in B), max(r[k] for r in B)
    nl, nh = min(r[k] for r in N), max(r[k] for r in N)
    fmt = '%.2f' if unit == 's' else '%.0f'
    ch = n - b
    print('%-26s %9s %9s %+9.2f   %-19s %-19s' % (
        label, fmt % b, fmt % n, ch,
        (fmt + ' - ' + fmt) % (bl, bh), (fmt + ' - ' + fmt) % (nl, nh)))
print()
print('per-run TBT before:', ['%.2f' % r['tbt'] for r in B])
print('per-run TBT now   :', ['%.2f' % r['tbt'] for r in N])
print('per-run S&L before:', ['%.2f' % r['sl'] for r in B])
print('per-run S&L now   :', ['%.2f' % r['sl'] for r in N])
