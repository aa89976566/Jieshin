"""Stabilise the ordered turntable views into a jitter-free frame sequence.

Each view is generated independently, so the object drifts in scale and the
rotation axis wanders by a few dozen pixels between azimuths. Left alone that
reads as the sculpture breathing and sliding while it turns.

Horizontal drift is corrected in full, using the ground slab rather than the
whole silhouette to locate the axis: the slab is roughly symmetric about the
turntable centre, while the lowered head swings far off it. Scale is corrected
only partially, because part of the height variation is real perspective from
the slab tilting toward the camera and should survive.

    python tools/turntable/build_frames.py
"""
import argparse
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
CANVAS = (1920, 1080)
TARGET_H = 830          # projected object height, in canvas pixels
SCALE_DAMPING = 0.7     # 1.0 would flatten genuine perspective changes
Y_DAMPING = 0.8
BG = np.array([230, 230, 230], dtype=np.float32)
MASK_THRESHOLD = 14


def analyse(im):
    """Background colour, occupied bounding box, and the rotation axis."""
    h, w, _ = im.shape
    bg = np.median(im[:30].reshape(-1, 3), axis=0)
    mask = np.abs(im - bg).max(axis=2) > MASK_THRESHOLD
    rows = np.where(mask.sum(axis=1) > w * 0.004)[0]
    cols = np.where(mask.sum(axis=0) > h * 0.004)[0]
    y0, y1, x0, x1 = rows[0], rows[-1], cols[0], cols[-1]

    lowest = int(y1 - 0.30 * (y1 - y0))
    xs = np.where(mask[lowest:y1 + 1].any(axis=0))[0]
    axis_x = (xs[0] + xs[-1]) / 2 if len(xs) else (x0 + x1) / 2
    return bg, (x0, y0, x1, y1), axis_x


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--views', default=os.path.join(ROOT, 'views'))
    ap.add_argument('--frames', default=os.path.join(ROOT, 'frames'))
    args = ap.parse_args()

    with open(os.path.join(ROOT, 'sequence.json')) as fh:
        paths = [os.path.join(args.views, name) for name in json.load(fh)]

    missing = [p for p in paths if not os.path.exists(p)]
    if missing:
        raise SystemExit(f'missing views: {missing}')

    os.makedirs(args.frames, exist_ok=True)

    measured = []
    for path in paths:
        im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
        measured.append((path, im) + analyse(im))

    median_h = float(np.median([box[3] - box[1] for *_, box, _ in measured]))
    print(f'median bbox height {median_h:.0f}px across {len(measured)} views')

    for idx, (path, im, bg, (x0, y0, x1, y1), axis_x) in enumerate(measured):
        flat = np.clip(im + (BG - bg), 0, 255)

        scale = ((TARGET_H / (y1 - y0)) ** SCALE_DAMPING
                 * (TARGET_H / median_h) ** (1 - SCALE_DAMPING))
        img = Image.fromarray(flat.astype(np.uint8))
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)

        target_cy = CANVAS[1] / 2
        cy = ((y0 + y1) / 2) * scale
        cy += (1 - Y_DAMPING) * (target_cy - cy)

        canvas = Image.new('RGB', CANVAS, tuple(BG.astype(int)))
        canvas.paste(img, (round(CANVAS[0] / 2 - axis_x * scale), round(target_cy - cy)))
        canvas.save(os.path.join(args.frames, f'f_{idx:03d}.png'))

    print(f'wrote {len(measured)} frames to {args.frames}')


if __name__ == '__main__':
    main()
