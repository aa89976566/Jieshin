"""Compose the final orbit from pose-locked views and an analytic ground slab.

Each view was generated from a render of the reconstructed mesh at an exact
azimuth, so the rotation is evenly spaced by construction. What the image model
still drifts on is framing: the same sculpture comes back slightly larger or
shifted from one view to the next. The mesh render is the ground truth for where
the object should sit, so each view is aligned to its own pose render before it
is used, which removes the drift the model introduced.

The ground is not generated at all. A generated slab would redraw its stones
every frame and boil; here it is a single fixed texture warped onto the ground
plane by the same camera, so the paving stays put while the sculpture turns. The
sculpture always stands on the plane and never below it, so it can simply be
laid over the slab with no depth sorting.

    DISPLAY=:1 python3 tools/turntable/compose_orbit.py --loops 3
"""
import argparse
import os
import subprocess

import cv2
import numpy as np

from render_mesh_orbit import (BG, camera_pose, ground_to_screen, render_ground,
                               torn_outline)

ROOT = os.path.dirname(os.path.abspath(__file__))
MASK_THRESHOLD = 14


def silhouette(img):
    background = np.median(img[:20].reshape(-1, 3), axis=0)
    return np.abs(img.astype(np.int16) - background).max(axis=2) > MASK_THRESHOLD


def placement(mask):
    """Bounding box of the object, plus the horizontal centre and the foot line."""
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    return (cols[0] + cols[-1]) / 2, float(rows[-1]), float(rows[-1] - rows[0])


def align_to_pose(view, pose_mask, size):
    """Match a generated view to the scale and position of its pose render."""
    target_cx, target_bottom, target_h = placement(pose_mask)
    mask = silhouette(view)
    cx, bottom, h = placement(mask)

    scale = target_h / max(h, 1)
    warp = np.array([[scale, 0, target_cx - cx * scale],
                     [0, scale, target_bottom - bottom * scale]], np.float32)

    colour = cv2.warpAffine(view.astype(np.float32), warp, size, flags=cv2.INTER_LANCZOS4,
                            borderMode=cv2.BORDER_CONSTANT, borderValue=(BG, BG, BG))
    alpha = cv2.warpAffine(mask.astype(np.float32), warp, size, flags=cv2.INTER_LINEAR,
                           borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    # tighten the feathered edge so the cutout keeps a crisp scan silhouette
    alpha = np.clip((alpha - 0.35) / 0.4, 0, 1)
    return colour, alpha[..., None]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--views', default=os.path.join(ROOT, 'views_locked'))
    ap.add_argument('--poses', default=os.path.join(ROOT, 'pose_solo'))
    ap.add_argument('--pavement', default=os.path.join(ROOT, 'pavement_texture.png'))
    ap.add_argument('--work', default=os.path.join(ROOT, 'composed'))
    ap.add_argument('--out', default='public/media/turntable-360.mp4')
    ap.add_argument('--fps', type=int, default=24)
    ap.add_argument('--loops', type=int, default=4)
    ap.add_argument('--width', type=int, default=1920)
    ap.add_argument('--elevation', type=float, default=16.0)
    ap.add_argument('--zoom', type=float, default=1.24)
    ap.add_argument('--slab-radius', type=float, default=1.55)
    ap.add_argument('--floor', type=float, default=None,
                    help='ground height in mesh units; read from the pose render if omitted')
    ap.add_argument('--shutter', type=float, default=0.0,
                    help='fraction of the step the shutter stays open into the next view')
    ap.add_argument('--crf', type=int, default=19)
    args = ap.parse_args()

    pose_names = sorted(n for n in os.listdir(args.poses) if n.endswith('.png'))
    view_names = sorted(n for n in os.listdir(args.views) if n.endswith('.png'))
    if len(pose_names) != len(view_names):
        raise SystemExit(f'{len(pose_names)} poses but {len(view_names)} views')

    height = args.width * 9 // 16
    size = (args.width, height)
    xmag, ymag = args.zoom * 16 / 9, args.zoom
    texture = cv2.imread(args.pavement)
    outline = torn_outline(args.slab_radius)

    os.makedirs(args.work, exist_ok=True)
    for stale in os.listdir(args.work):
        os.remove(os.path.join(args.work, stale))

    total = len(view_names)
    layers = []
    for pose_name, view_name in zip(pose_names, view_names):
        pose_img = cv2.imread(os.path.join(args.poses, pose_name))
        pose_img = cv2.resize(pose_img, size, interpolation=cv2.INTER_AREA)
        view = cv2.imread(os.path.join(args.views, view_name))
        colour, alpha = align_to_pose(view, silhouette(pose_img), size)
        layers.append((colour * alpha, alpha))
    print(f'aligned {total} views to their pose renders')

    for i in range(total):
        # a shutter open across part of the step averages out the frame-to-frame
        # flutter in the fibre, the way a real exposure would
        weights = {i: 1.0 - args.shutter * 0.5}
        if args.shutter > 0:
            weights[(i + 1) % total] = args.shutter * 0.5
        premultiplied = sum(layers[k][0] * w for k, w in weights.items())
        alpha = sum(layers[k][1] * w for k, w in weights.items())
        horse = premultiplied / np.maximum(alpha, 1e-4)

        pose = camera_pose(i / total * 360.0, args.elevation, 3.4)
        affine = ground_to_screen(pose, xmag, ymag, size, args.floor)
        paving, slab = render_ground(texture, outline, affine, size,
                                     extent=args.slab_radius * 1.05)

        canvas = np.full((height, args.width, 3), float(BG), np.float32)
        canvas = paving.astype(np.float32) * slab + canvas * (1 - slab)
        canvas = horse * alpha + canvas * (1 - alpha)

        cv2.imwrite(os.path.join(args.work, f'c_{i:04d}.png'),
                    np.clip(canvas, 0, 255).astype(np.uint8))
    print(f'composed {total} frames')

    playlist = os.path.join(args.work, 'loops.txt')
    with open(playlist, 'w') as fh:
        for _ in range(args.loops):
            for i in range(total):
                fh.write(f"file '{args.work}/c_{i:04d}.png'\nduration {1 / args.fps}\n")
        fh.write(f"file '{args.work}/c_0000.png'\n")

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', playlist,
        '-vf', f'fps={args.fps},format=yuv420p', '-c:v', 'libx264', '-crf', str(args.crf),
        '-preset', 'veryslow', '-movflags', '+faststart', args.out,
    ], check=True)
    print(f'wrote {args.out}')


if __name__ == '__main__':
    main()
