"""Order the turntable views and report which gaps are still too wide.

The views are produced one azimuth at a time by an image model, which does not
space rotations evenly however precisely they are asked for. So the sequence is
densified adaptively rather than uniformly: measure how far the object actually
travels between neighbouring views, then generate extra in-between views only
where the jump is still too large to read as continuous motion.

Silhouette IoU is the travel metric. It tracks how much of the object moves
between two views, which is exactly what decides whether the step reads as
rotation or as a cut.

    python tools/turntable/sequence.py report 0.78
    python tools/turntable/sequence.py insert sub2
"""
import argparse
import json
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(ROOT, 'sequence.json')
BG_VALUE = 230
MASK_THRESHOLD = 14


def load():
    with open(MANIFEST) as fh:
        return json.load(fh)


def save(order):
    with open(MANIFEST, 'w') as fh:
        json.dump(order, fh, indent=1)


def silhouettes(frames):
    names = sorted(n for n in os.listdir(frames) if n.startswith('f_') and n.endswith('.png'))
    out = []
    for n in names:
        img = cv2.imread(os.path.join(frames, n))
        out.append(np.abs(img.astype(np.int16) - BG_VALUE).max(axis=2) > MASK_THRESHOLD)
    return out


def gaps(frames):
    """Travel between neighbouring views, wrapping around the full turn."""
    masks = silhouettes(frames)
    pairs = list(zip(masks, masks[1:])) + [(masks[-1], masks[0])]
    return [float((a & b).sum() / (a | b).sum()) for a, b in pairs]


def cmd_report(args):
    order = load()
    measured = gaps(args.frames)
    wide = [(i, v) for i, v in enumerate(measured) if v < args.threshold]
    print(f'{len(measured)} intervals, {len(wide)} below IoU {args.threshold}')
    print(f'min {min(measured):.3f}  median {sorted(measured)[len(measured) // 2]:.3f}  '
          f'max {max(measured):.3f}')
    for i, v in wide:
        after = order[i + 1] if i + 1 < len(order) else order[0]
        print(f'GEN {i:03d}  IoU {v:.3f}  {order[i]}  {after}')


def cmd_insert(args):
    """Insert every view named <tag>_<interval>.png just after its interval."""
    order = load()
    additions = {}
    for name in os.listdir(args.views):
        if name.startswith(args.tag + '_') and name.endswith('.png'):
            additions[int(name[len(args.tag) + 1:-4])] = name
    for i in sorted(additions, reverse=True):
        order.insert(i + 1, additions[i])
    save(order)
    print(f'inserted {len(additions)} views, sequence is now {len(order)} views')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--views', default=os.path.join(ROOT, 'views'))
    ap.add_argument('--frames', default=os.path.join(ROOT, 'frames'))
    sub = ap.add_subparsers(dest='action', required=True)

    report = sub.add_parser('report')
    report.add_argument('threshold', type=float, nargs='?', default=0.90)
    report.set_defaults(func=cmd_report)

    insert = sub.add_parser('insert')
    insert.add_argument('tag')
    insert.set_defaults(func=cmd_insert)

    parsed = ap.parse_args()
    parsed.func(parsed)
