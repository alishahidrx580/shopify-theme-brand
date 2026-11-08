"""Cost of the Instagram feed app's script on the product page, from every
live-arm Lighthouse run on disk (mobile, simulated slow-4G / 4x CPU)."""
import glob
import io
import json
import os
import statistics as st

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, '..')
files = sorted(glob.glob(os.path.join(root, 'ab*', 'live-?.json')) +
               glob.glob(os.path.join(root, 'ab', 'base-?.json')))


def is_ig(u):
    u = u or ''
    return 'gsc-instafeed' in u or 'getsitecontrol' in u or 'gsc-instagram' in u


rows = []
for p in files:
    d = json.load(io.open(p, encoding='utf-8'))
    a = d['audits']
    boot = a.get('bootup-time', {}).get('details', {}).get('items', [])
    total = sum(i.get('total') or 0 for i in boot if is_ig(i.get('url')))
    scripting = sum(i.get('scripting') or 0 for i in boot if is_ig(i.get('url')))
    reqs = a['network-requests']['details']['items']
    ig = [r for r in reqs if is_ig(r['url'])]
    kb = sum((r.get('transferSize') or 0) for r in ig) / 1024
    net = sum(max(0, r.get('networkEndTime', 0) - r.get('networkRequestTime', 0)) for r in ig)
    block = 0
    for i in a.get('third-party-summary', {}).get('details', {}).get('items', []):
        e = i.get('entity')
        e = e if isinstance(e, str) else (e or {}).get('text', '')
        if 'getsitecontrol' in e.lower() or 'gsc' in e.lower():
            block += i.get('blockingTime') or 0
    rows.append((os.path.basename(os.path.dirname(p)) + '/' + os.path.basename(p),
                 total, scripting, len(ig), kb, net, block,
                 a['total-blocking-time']['numericValue']))

print('%-16s %9s %10s %5s %7s %8s %10s %8s' %
      ('run', 'cpu ms', 'script ms', 'reqs', 'KB', 'net ms', 'blocking', 'page TBT'))
for r in rows:
    print('%-16s %9.0f %10.0f %5d %7.1f %8.0f %10.0f %8.0f' % r)
cpu = [r[1] for r in rows]
blk = [r[6] for r in rows]
print()
print('runs: %d' % len(rows))
print('script CPU time   median %.0f ms   min %.0f   max %.0f   (= %.2f s)' %
      (st.median(cpu), min(cpu), max(cpu), st.median(cpu) / 1000))
print('blocking time     median %.0f ms   min %.0f   max %.0f' % (st.median(blk), min(blk), max(blk)))
print('page TBT (all)    median %.0f ms' % st.median([r[7] for r in rows]))
