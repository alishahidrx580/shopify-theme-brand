"""Count style recalcs in a Lighthouse trace (-G output folder).

Usage: python -I recalc.py <folder> [<folder> ...]

Native, unthrottled numbers from the renderer main thread, so they are far
less sensitive to host CPU drift than the simulated Lighthouse score.
"""
import collections
import io
import json
import os
import sys


def analyse(folder):
    path = os.path.join(folder, 'defaultPass.trace.json')
    t = json.load(io.open(path, encoding='utf-8'))
    ev = t['traceEvents'] if isinstance(t, dict) else t
    names = {(e['pid'], e['tid']): e['args'].get('name')
             for e in ev if e.get('ph') == 'M' and e.get('name') == 'thread_name'}
    main_key = next(k for k, v in names.items() if v == 'CrRendererMain')
    main = [e for e in ev if (e.get('pid'), e.get('tid')) == main_key and e.get('ph') == 'X']
    t0 = min(e['ts'] for e in main)
    ult = [e for e in main if e['name'] == 'UpdateLayoutTree']
    lay = [e for e in main if e['name'] == 'Layout']
    late = [e for e in ult if (e['ts'] - t0) / 1e6 > 3.0]  # after the initial load burst
    per_sec = collections.Counter(int((e['ts'] - t0) / 1e6) for e in ult)
    return dict(
        recalcs=len(ult),
        recalc_ms=round(sum(e['dur'] for e in ult) / 1000),
        layout_ms=round(sum(e['dur'] for e in lay) / 1000),
        late_recalcs=len(late),
        late_recalc_ms=round(sum(e['dur'] for e in late) / 1000),
        frames=sum(1 for e in main if e['name'] == 'Commit'),
        per_sec=[per_sec[s] for s in range(0, 12)],
    )


for folder in sys.argv[1:]:
    r = analyse(folder)
    print('%-34s recalcs=%-4d (%5d ms)  layout=%4d ms  | after 3s: %-4d (%5d ms)  commits=%d' % (
        os.path.basename(folder.rstrip('/\\')), r['recalcs'], r['recalc_ms'], r['layout_ms'],
        r['late_recalcs'], r['late_recalc_ms'], r['frames']))
    print('   per-second recalcs:', r['per_sec'])
