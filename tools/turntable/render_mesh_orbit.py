"""Render a true 360 degree turntable from the reconstructed mesh.

Chaining independently generated views can never hold geometry still: the
silhouette boils and the rotation lurches, because no two views describe quite
the same object. Reconstructing an actual mesh and orbiting a camera around it
removes the problem at the source - the geometry is one object now, and the
rotation is exact by construction.

What the reconstruction gives up is texture crispness: the colour field decoded
from a single view is smooth and pale next to the source. Two cheap terms put
the bite back without inventing detail - a cavity term darkening the crevices,
which is where a real scan reads as solid, and a saturation lift back toward the
dried-fibre palette.

The sculpture keeps a slab of its own courtyard paving underneath it, cut off
with a jagged edge. It is the only trace of where the work actually stood, and
it is the convention real scan assets use when they cannot separate an object
from its ground. The slab is flat, so it is projected analytically rather than
rendered as geometry: an affine warp of the paving texture, masked to the torn
outline. That keeps the stones at full resolution, and the horse never needs to
be depth-sorted against it because the horse stands on the plane, never below.

    DISPLAY=:1 python3 tools/turntable/render_mesh_orbit.py --seconds 12
"""
import argparse
import os
import subprocess

import cv2
import numpy as np
import pyrender
import trimesh
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
BG = 230                    # the flat viewport grey the scan sits against
UP_FROM_MESH = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)


def cavity(mesh, strength):
    """Per-vertex darkening in concavities, standing in for baked occlusion."""
    normals = np.asarray(mesh.vertex_normals)
    verts = np.asarray(mesh.vertices)

    neighbour_sum = np.zeros_like(verts)
    neighbour_count = np.zeros(len(verts))
    edges = mesh.edges_unique
    for a, b in ((edges[:, 0], edges[:, 1]), (edges[:, 1], edges[:, 0])):
        np.add.at(neighbour_sum, a, verts[b])
        np.add.at(neighbour_count, a, 1)
    to_neighbours = neighbour_sum / np.maximum(neighbour_count, 1)[:, None] - verts

    # pointing along the normal means the surface curves away: a pit, not a ridge
    openness = (to_neighbours * normals).sum(axis=1) / (np.linalg.norm(to_neighbours, axis=1) + 1e-9)
    return 1.0 - strength * np.clip(-openness, 0, 1)


def prepare_mesh(path, saturation, contrast, cavity_strength, smoothing, lift):
    mesh = trimesh.load(path, process=False)
    mesh.vertices = np.asarray(mesh.vertices) @ UP_FROM_MESH.T
    # the decoded density field is pebbly; smoothing settles it into a surface
    mesh = trimesh.smoothing.filter_taubin(mesh, iterations=smoothing)

    colours = np.asarray(mesh.visual.vertex_colors)[:, :3].astype(np.float32) / 255.0
    grey = colours.mean(axis=1, keepdims=True)
    colours = np.clip(grey + (colours - grey) * saturation, 0, 1)
    colours = np.clip((colours - 0.5) * contrast + 0.5, 0, 1)
    colours *= cavity(mesh, cavity_strength)[:, None]
    mesh.visual.vertex_colors = np.clip(colours * 255, 0, 255).astype(np.uint8)

    mesh.vertices -= mesh.bounds.mean(axis=0)
    mesh.vertices /= np.abs(mesh.bounds).max()
    # sit the object above the camera target so the slab has room in frame
    mesh.vertices[:, 1] += lift
    return mesh


def torn_outline(radius, sides=180, seed=7):
    """The ragged boundary a scan leaves where the ground was cropped away."""
    rng = np.random.default_rng(seed)
    wobble = rng.normal(1.0, 0.10, sides)
    padded = np.r_[wobble[-6:], wobble, wobble[:6]]
    wobble = np.convolve(padded, np.ones(7) / 7, 'same')[6:-6]
    wobble += rng.normal(0, 0.018, sides)          # keep a little polygon chatter

    angles = np.linspace(0, 2 * np.pi, sides, endpoint=False)
    r = radius * wobble
    return np.column_stack([np.cos(angles) * r, np.sin(angles) * r])


def camera_pose(azimuth, elevation, distance):
    a, e = np.radians(azimuth), np.radians(elevation)
    eye = np.array([np.sin(a) * np.cos(e), np.sin(e), np.cos(a) * np.cos(e)]) * distance
    forward = eye / np.linalg.norm(eye)
    right = np.cross([0.0, 1.0, 0.0], forward)
    right /= np.linalg.norm(right)
    pose = np.eye(4)
    pose[:3, 0], pose[:3, 1], pose[:3, 2], pose[:3, 3] = right, np.cross(forward, right), forward, eye
    return pose


def ground_to_screen(pose, xmag, ymag, size, floor):
    """Affine map from a point on the ground plane to pixels, for this camera."""
    w, h = size
    rotation, eye = pose[:3, :3], pose[:3, 3]

    def project(x, z):
        cam = rotation.T @ (np.array([x, floor, z]) - eye)
        return ((cam[0] / xmag * 0.5 + 0.5) * w, (0.5 - cam[1] / ymag * 0.5) * h)

    origin = np.array(project(0, 0))
    dx = np.array(project(1, 0)) - origin
    dz = np.array(project(0, 1)) - origin
    return np.column_stack([dx, dz, origin])


def render_ground(texture, outline, affine, size, extent):
    """Warp the paving onto the ground plane and cut it to the torn outline."""
    w, h = size
    tex_h, tex_w = texture.shape[:2]
    # texture pixel -> world metres -> screen
    to_world = np.array([[2 * extent / tex_w, 0, -extent],
                         [0, 2 * extent / tex_h, -extent],
                         [0, 0, 1]])
    full = np.vstack([affine, [0, 0, 1]]) @ to_world

    warped = cv2.warpAffine(texture, full[:2], (w, h), flags=cv2.INTER_LINEAR,
                            borderMode=cv2.BORDER_REFLECT)
    polygon = (outline @ affine[:, :2].T + affine[:, 2]).astype(np.int32)

    supersample = 4
    mask = np.zeros((h * supersample, w * supersample), np.uint8)
    cv2.fillPoly(mask, [polygon * supersample], 255)
    mask = cv2.resize(mask, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    return warped, mask[..., None]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mesh', default=os.path.join(ROOT, 'horse.ply'))
    ap.add_argument('--pavement', default=os.path.join(ROOT, 'pavement_texture.png'))
    ap.add_argument('--work', default=os.path.join(ROOT, 'mesh_render'))
    ap.add_argument('--out', default='public/media/turntable-360.mp4')
    ap.add_argument('--seconds', type=float, default=12.0)
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--width', type=int, default=1920)
    ap.add_argument('--supersample', type=int, default=2)
    ap.add_argument('--elevation', type=float, default=16.0)
    ap.add_argument('--saturation', type=float, default=1.60)
    ap.add_argument('--contrast', type=float, default=1.24)
    ap.add_argument('--cavity', type=float, default=0.28)
    ap.add_argument('--smoothing', type=int, default=24)
    ap.add_argument('--slab-radius', type=float, default=1.55)
    ap.add_argument('--zoom', type=float, default=1.24)
    ap.add_argument('--lift', type=float, default=0.16)
    ap.add_argument('--no-ground', action='store_true')
    ap.add_argument('--crf', type=int, default=19)
    args = ap.parse_args()

    mesh = prepare_mesh(args.mesh, args.saturation, args.contrast, args.cavity, args.smoothing, args.lift)
    floor = float(mesh.bounds[0][1])
    print(f'ground plane at y = {floor:.6f}')
    renderable = pyrender.Mesh.from_trimesh(mesh, smooth=True)

    height = args.width * 9 // 16
    size = (args.width, height)
    big = (args.width * args.supersample, height * args.supersample)
    xmag, ymag = args.zoom * 16 / 9, args.zoom

    texture = cv2.imread(args.pavement)
    outline = torn_outline(args.slab_radius)

    renderer = pyrender.OffscreenRenderer(*big)
    os.makedirs(args.work, exist_ok=True)
    for stale in os.listdir(args.work):
        os.remove(os.path.join(args.work, stale))

    total = int(round(args.seconds * args.fps))
    for i in range(total):
        pose = camera_pose(i / total * 360.0, args.elevation, 3.4)

        scene = pyrender.Scene(bg_color=[0, 0, 0, 1], ambient_light=[0.82] * 3)
        scene.add(renderable)
        scene.add(pyrender.OrthographicCamera(xmag=xmag, ymag=ymag), pose=pose)
        # a weak fill riding with the camera keeps the read matte and shadowless
        scene.add(pyrender.DirectionalLight(intensity=1.1), pose=pose)
        colour, depth = renderer.render(scene)

        # resolve coverage separately from colour so edges do not pick up backdrop
        cover = (depth > 0).astype(np.float32)
        alpha = cv2.resize(cover, size, interpolation=cv2.INTER_AREA)[..., None]
        rendered = cv2.cvtColor(colour, cv2.COLOR_RGB2BGR).astype(np.float32)
        premultiplied = cv2.resize(rendered * cover[..., None], size,
                                   interpolation=cv2.INTER_AREA)
        horse = premultiplied / np.maximum(alpha, 1e-4)

        canvas = np.full((height, args.width, 3), float(BG), np.float32)
        if not args.no_ground:
            affine = ground_to_screen(pose, xmag, ymag, size, floor)
            paving, slab = render_ground(texture, outline, affine, size,
                                         extent=args.slab_radius * 1.05)
            canvas = paving.astype(np.float32) * slab + canvas * (1 - slab)
        canvas = horse * alpha + canvas * (1 - alpha)

        cv2.imwrite(os.path.join(args.work, f'm_{i:04d}.png'),
                    np.clip(canvas, 0, 255).astype(np.uint8))
        if i % 30 == 0:
            print(f'frame {i}/{total}', flush=True)
    renderer.delete()

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(args.fps),
        '-i', os.path.join(args.work, 'm_%04d.png'),
        '-vf', 'format=yuv420p', '-c:v', 'libx264', '-crf', str(args.crf),
        '-preset', 'veryslow', '-movflags', '+faststart', args.out,
    ], check=True)
    print(f'wrote {args.out}')


if __name__ == '__main__':
    main()
