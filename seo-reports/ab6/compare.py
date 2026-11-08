"""LCP A/B: live vs the head preload of the hero image (preview theme)."""
import glob
import io
import json
import os
import statistics as st

here = os.path.dirname(os.path.abspath(__file__))


def row(p):
    d = json.load(io.open(p, encoding='utf-8'))
    a = d['audits']
    parts = {}
    try:
        for it in a['lcp-breakdown-insight']['details']['items'][0]['items']:
            parts[it['subpart']] = it['duration'] / 1000
    except Exception:
        pass
    reqs = a['network-requests']['details']['items']
    hero = [r for r in reqs if 'cham_card_maskbox_1080_1' in r['url'] and 'width=160' not in r['url']]
    start = min((r['networkRequestTime'] for r in hero), default=None)
    return dict(
        lcp=a['largest-contentful-paint']['numericValue'] / 1000,
        fcp=a['first-contentful-paint']['numericValue'] / 1000,
        score=(d['categories']['performance']['score'] or 0) * 100,
        ttfb=parts.get('timeToFirstByte', 0),
        delay=parts.get('resourceLoadDelay', 0),
        load=parts.get('resourceLoadDuration', 0),
        render=parts.get('elementRenderDelay', 0),
        hero_start=(start / 1000) if start is not None else None,
        hero_reqs=len(hero),
    )


arms = {}
for p in sorted(glob.glob(os.path.join(here, '*-?.json'))):
    arms.setdefault(os.path.basename(p).split('-')[0], []).append(row(p))

med = lambda rs, k: st.median([r[k] for r in rs if r[k] is not None])
print('%-5s %2s %8s %8s %8s | %9s %12s %10s %12s | %10s %5s' %
      ('arm', 'n', 'LCP s', 'FCP s', 'score', 'TTFB s', 'load delay s', 'load s', 'render dly s', 'hero req@s', 'reqs'))
for a, rs in arms.items():
    print('%-5s %2d %8.2f %8.2f %8.0f | %9.2f %12.2f %10.2f %12.2f | %10.2f %5d' % (
        a, len(rs), med(rs, 'lcp'), med(rs, 'fcp'), med(rs, 'score'), med(rs, 'ttfb'), med(rs, 'delay'),
        med(rs, 'load'), med(rs, 'render'), med(rs, 'hero_start'), int(med(rs, 'hero_reqs'))))
print()
for a, rs in arms.items():
    print(a, 'LCP  ', ['%.2f' % r['lcp'] for r in rs])
    print(a, 'delay', ['%.2f' % r['delay'] for r in rs], ' (observed, unthrottled: first byte -> image request starts)')
