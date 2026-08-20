"""Render the turntable views into a seamless 360 degree orbit.

Frame interpolation is deliberately not used here. On a subject built from thin
branches and dried fibre, both block matching and dense optical flow lose the
silhouette and produce a double exposure rather than a rotation, so every frame
in the output is composed only from views that were actually generated.

What the views lack is even spacing. Rather than force it, the timeline is
warped: each view is held for a span proportional to how far the object really
travels before the next one. Angular velocity becomes constant even though the
steps are not, and constant velocity is what the eye reads as smooth.

A shutter is then integrated across each output frame, so a wider step picks up
proportionally more motion blur, exactly as a real camera would on a turntable.

    python tools/turntable/render_orbit.py --seconds 5 --loops 3
"""
import argparse
import os
import subprocess

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
BG_VALUE = 230
MASK_THRESHOLD = 14


def travel(paths):
    """Distance between neighbouring views, wrapping around the full turn."""
    masks = []
    for p in paths:
        img = cv2.imread(p)
        masks.append(np.abs(img.astype(np.int16) - BG_VALUE).max(axis=2) > MASK_THRESHOLD)
    steps = []
    for i, a in enumerate(masks):
        b = masks[(i + 1) % len(masks)]
        steps.append(1.0 - (a & b).sum() / (a | b).sum())
    return np.array(steps)


def spans(steps):
    """Where each view sits along the revolution, and the span it owns."""
    position = np.concatenate([[0.0], np.cumsum(steps)])
    total = position[-1]
    edges = np.empty(len(steps) + 1)
    edges[0] = 0.0
    for i in range(1, len(steps)):
        edges[i] = position[i] - steps[i - 1] * 0.5
    edges[len(steps)] = total - steps[-1] * 0.5
    return edges, total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--frames', default=os.path.join(ROOT, 'frames'))
    ap.add_argument('--work', default=os.path.join(ROOT, 'render'))
    ap.add_argument('--seconds', type=float, default=5.0, help='duration of one revolution')
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--shutter', type=float, default=0.5,
                    help='0 holds each view crisply, 1 blurs across the whole step')
    ap.add_argument('--loops', type=int, default=3)
    ap.add_argument('--crf', type=int, default=20)
    ap.add_argument('--out', default='public/media/turntable-360.mp4')
    args = ap.parse_args()

    names = sorted(n for n in os.listdir(args.frames) if n.startswith('f_') and n.endswith('.png'))
    paths = [os.path.join(args.frames, n) for n in names]
    steps = travel(paths)
    edges, total = spans(steps)
    n = len(paths)

    os.makedirs(args.work, exist_ok=True)
    for stale in os.listdir(args.work):
        os.remove(os.path.join(args.work, stale))

    out_frames = int(round(args.seconds * args.fps))
    slice_width = total / out_frames
    shutter = max(args.shutter, 1e-4) * slice_width

    cache = {}

    def view(i):
        if i not in cache:
            if len(cache) > 8:
                cache.pop(next(iter(cache)))
            cache[i] = cv2.imread(paths[i]).astype(np.float32)
        return cache[i]

    for m in range(out_frames):
        start = m * slice_width
        stop = start + shutter

        weights = {}
        for turn in (-1, 0, 1):
            for i in range(n):
                lo, hi = edges[i] + turn * total, edges[i + 1] + turn * total
                overlap = min(stop, hi) - max(start, lo)
                if overlap > 0:
                    weights[i] = weights.get(i, 0.0) + overlap
        norm = sum(weights.values())

        acc = None
        for i, w in weights.items():
            part = view(i) * (w / norm)
            acc = part if acc is None else acc + part
        cv2.imwrite(os.path.join(args.work, f'r_{m:04d}.png'),
                    np.clip(acc, 0, 255).astype(np.uint8))

    print(f'{n} views -> {out_frames} frames  '
          f'(step travel min {steps.min():.3f} max {steps.max():.3f})')

    playlist = os.path.join(args.work, 'loops.txt')
    with open(playlist, 'w') as fh:
        for _ in range(args.loops):
            for m in range(out_frames):
                fh.write(f"file '{args.work}/r_{m:04d}.png'\nduration {1 / args.fps}\n")
        fh.write(f"file '{args.work}/r_0000.png'\n")

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', playlist,
        '-vf', f'fps={args.fps},format=yuv420p', '-c:v', 'libx264', '-crf', str(args.crf),
        '-preset', 'veryslow', '-movflags', '+faststart', args.out,
    ], check=True)
    print(f'wrote {args.out}')


if __name__ == '__main__':
    main()
