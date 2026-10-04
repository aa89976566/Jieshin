"""Reconstruct a 3D mesh of the sculpture from a single scan-style view.

Uses TripoSR for single-image reconstruction. Two things matter about the input:
the object must be isolated with no ground under it, and it must be seen from a
three-quarter angle. Feeding in a view that included the paving slab produced a
flat plate with the horse in low relief, because the slab dominated the frame.

Setup, on a machine with no GPU:

    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
    pip install "transformers==4.44.2" einops omegaconf trimesh PyMCubes imageio
    git clone https://github.com/VAST-AI-Research/TripoSR

TripoSR needs two patches to run here. Its isosurface helper imports
``torchmcubes``, which only builds against CUDA, so swap in PyMCubes and drop
the axis permutation that torchmcubes needs but PyMCubes does not. Its utils
module imports ``rembg`` at import time, which is unnecessary because the
background is removed below; make that import optional. Newer transformers
releases renamed the ViT weights, hence the 4.44 pin.

    python3 tools/turntable/reconstruct_mesh.py solo_view.png horse.ply 320
"""
import os
import sys

import numpy as np
import torch
from PIL import Image

TRIPOSR = os.environ.get('TRIPOSR_PATH', '/workspace/.tmp_turntable/TripoSR')
sys.path.insert(0, TRIPOSR)

from tsr.system import TSR
from tsr.utils import resize_foreground

MASK_THRESHOLD = 14


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else 'solo_view.png'
    out = sys.argv[2] if len(sys.argv) > 2 else 'horse.ply'
    resolution = int(sys.argv[3]) if len(sys.argv) > 3 else 320

    rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.int16)
    background = np.median(rgb[:30].reshape(-1, 3), axis=0)
    alpha = (np.abs(rgb - background).max(axis=2) > MASK_THRESHOLD).astype(np.uint8) * 255
    cutout = resize_foreground(Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), 'RGBA'), 0.85)

    arr = np.asarray(cutout).astype(np.float32) / 255.0
    # TripoSR expects the subject composited onto mid grey, not onto transparency
    composited = arr[..., :3] * arr[..., 3:4] + 0.5 * (1 - arr[..., 3:4])
    image = Image.fromarray((composited * 255).astype(np.uint8))

    torch.set_num_threads(os.cpu_count())
    model = TSR.from_pretrained('stabilityai/TripoSR', config_name='config.yaml',
                                weight_name='model.ckpt')
    model.renderer.set_chunk_size(4096)
    model.to('cpu')

    with torch.no_grad():
        scene_codes = model([image], device='cpu')

    mesh = model.extract_mesh(scene_codes, True, resolution=resolution)[0]
    mesh.export(out)
    print(f'{len(mesh.vertices)} verts, {len(mesh.faces)} faces -> {out}')


if __name__ == '__main__':
    main()
