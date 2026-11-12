"""What downloads before the page's load event, and when the gallery slides start.

Usage: python -I early_bytes.py <lighthouse.json> [...]
Mobile emulation. Times are Lighthouse's observed (unthrottled) network times.
"""
import io
import json
import sys


def analyse(path):
    d = json.load(io.open(path, encoding='utf-8'))
    a = d['audits']
    reqs = a['network-requests']['details']['items']
    m = a['metrics']['details']['items'][0]
    load = m.get('observedLoad') or 0
    early = [r for r in reqs if r['networkRequestTime'] <= load]
    gallery = [r for r in reqs if r.get('resourceType') == 'Image' and any(
        k in r['url'] for k in ('cham_card_maskbox', 'Frame_2147223664', 'Frame_2147223663',
                                 'Skin_concerns_infographic', 'Result_acne_marks', 'Result_dark_spots'))
               and 'width=160' not in r['url']]
    return dict(
        load_ms=round(load),
        total_kb=round(sum(r.get('transferSize') or 0 for r in reqs) / 1024),
        before_load_kb=round(sum(r.get('transferSize') or 0 for r in early) / 1024),
        before_load_reqs=len(early),
        products_json=any('products.json' in r['url'] for r in reqs),
        video_kb=round(sum(r.get('transferSize') or 0 for r in reqs if r.get('resourceType') == 'Media') / 1024),
        gallery=[(r['url'].split('/files/')[1].split('?')[0][:22], r['url'].split('width=')[1].split('&')[0] if 'width=' in r['url'] else '?',
                  round(r['networkRequestTime']), round((r.get('transferSize') or 0) / 1024)) for r in gallery],
        lcp=round(a['largest-contentful-paint']['numericValue']),
        fcp=round(a['first-contentful-paint']['numericValue']),
        si=round(a['speed-index']['numericValue']),
    )


for p in sys.argv[1:]:
    r = analyse(p)
    print('== %s' % p)
    print('   load event %d ms | total %d KB | before load: %d KB in %d requests' % (
        r['load_ms'], r['total_kb'], r['before_load_kb'], r['before_load_reqs']))
    print('   products.json fetched: %s | video bytes: %d KB' % (r['products_json'], r['video_kb']))
    print('   simulated: FCP %d ms  LCP %d ms  Speed Index %d ms' % (r['fcp'], r['lcp'], r['si']))
    for name, w, t, kb in sorted(r['gallery'], key=lambda x: x[2]):
        print('     gallery %-24s %5sw  requested at %5d ms  %4d KB%s' % (name, w, t, kb, '   (after load)' if t > r['load_ms'] else ''))
