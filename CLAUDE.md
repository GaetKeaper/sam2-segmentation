# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this repository is

This is a fork of **SAM 2 (Segment Anything Model 2)** by Meta AI / FAIR — a
foundation model for promptable visual segmentation in **images and videos**.
The upstream project lives at https://github.com/facebookresearch/sam2.

The core is a Python package (`sam2/`) plus training code (`training/`),
evaluation toolkits (`tools/`, `sav_dataset/`), and a full-stack web demo
(`demo/`). This fork additionally adds a **Forensic Evidence Dashboard** React
component to the demo frontend (see below) — it is unrelated to segmentation and
lives entirely under `demo/frontend/src/forensic/`.

## Repository layout

```
sam2/                 # The installable Python package ("sam2") — model + inference
  build_sam.py        # Entry points: build_sam2(), build_sam2_video_predictor(), from_pretrained()
  sam2_image_predictor.py    # SAM2ImagePredictor — single-image prediction API
  sam2_video_predictor.py    # SAM2VideoPredictor — video / multi-object tracking API
  sam2_video_predictor_legacy.py
  automatic_mask_generator.py # SAM2AutomaticMaskGenerator — "segment everything"
  benchmark.py
  modeling/           # Network architecture (nn.Modules, instantiated via Hydra)
    sam2_base.py      # SAM2Base — ties encoders, memory, and decoder together
    backbones/        # Hiera image encoder (hieradet.py), image_encoder.py
    memory_attention.py, memory_encoder.py   # Streaming memory for video
    position_encoding.py, sam2_utils.py
    sam/              # mask_decoder.py, prompt_encoder.py, transformer.py
  configs/            # Hydra YAML model configs (the source of truth for architecture)
    sam2/             # SAM 2.0 model configs (hiera_t/s/b+/l)
    sam2.1/           # SAM 2.1 model configs (preferred / latest)
    sam2.1_training/  # Training/fine-tune configs (e.g. MOSE finetune)
  utils/              # amg.py (mask utils), misc.py, transforms.py
  csrc/               # CUDA extension source (connected_components.cu) -> sam2._C

training/             # Standalone training stack (not part of the pip package)
  train.py            # Launch entry point (single/multi-node via submitit/SLURM)
  trainer.py, optimizer.py, loss_fns.py
  model/sam2.py       # Training wrapper around the model
  dataset/            # VOS dataset loaders, samplers, transforms
  utils/              # distributed, checkpoint, logging, data utils

tools/                # vos_inference.py — semi-supervised VOS inference (DAVIS/MOSE/SA-V)
sav_dataset/          # SA-V dataset utilities + sav_evaluator.py (J&F metrics)
notebooks/            # Jupyter examples: image, video, automatic mask generator
checkpoints/          # download_ckpts.sh + downloaded .pt weights (gitignored)

demo/                 # Full-stack web demo
  backend/            # Flask + Strawberry GraphQL inference server (Python)
    server/app.py     # App entry point; GraphQL schema under server/data/
    server/inference/ # predictor.py wraps SAM2VideoPredictor for the API
  frontend/           # Vite + React + TypeScript + Relay (GraphQL) SPA
    src/demo/         # The main SAM 2 demo UI
    src/forensic/     # ** Fork addition: ForensicDashboard.tsx (see below) **
    src/App.tsx       # Routes: /forensic -> dashboard, * -> SAM2 demo
  data/gallery/       # Default demo videos
```

## Core architecture (how the model fits together)

Everything is wired through **Hydra**. A model YAML in `sam2/configs/` lists
`_target_` class paths and constructor args; `build_sam2()` calls
`hydra.utils.instantiate()` to build the object graph. To change architecture,
edit/add a config — do not hardcode module wiring.

- `SAM2Base` (`modeling/sam2_base.py`) is the top-level module. It composes:
  - **Image encoder** — Hiera hierarchical ViT (`backbones/hieradet.py`) + FPN neck (`image_encoder.py`).
  - **Memory attention / memory encoder** — the video-specific innovation; conditions the current frame on a memory bank of past frames for streaming object tracking.
  - **SAM-style prompt encoder + mask decoder** (`modeling/sam/`) — turns points/boxes/masks into segmentation masks.
- Inference is exposed through three user-facing classes:
  - `SAM2ImagePredictor` — image use; set image, then prompt with points/boxes.
  - `SAM2VideoPredictor` — video use; `init_state`, `add_new_points_or_box`, `propagate_in_video`. Supports multi-object tracking and CPU/GPU state offloading.
  - `SAM2AutomaticMaskGenerator` — grid-prompt "segment everything".
- Model sizes: tiny / small / base-plus (`b+`) / large, each in SAM 2.0 and SAM 2.1 flavors. **Prefer SAM 2.1 configs/checkpoints** unless a task specifically needs 2.0.

## Environment & setup

- **Python ≥ 3.10**, **PyTorch ≥ 2.5.1**, **torchvision ≥ 0.20.1**. See `INSTALL.md` for the authoritative, troubleshooting-heavy guide.
- Install the package in editable mode from the repo root:
  ```bash
  pip install -e .
  pip install -e ".[notebooks]"   # adds matplotlib, opencv, jupyter, decord
  pip install -e ".[dev]"         # black/usort/ufmt, fvcore, tensorboard, submitit, etc.
  pip install -e ".[interactive-demo]"  # Flask/GraphQL/av deps for the demo backend
  ```
- The build compiles an **optional CUDA extension** (`sam2._C`) for post-processing. It is allowed to fail silently. Toggle with env vars: `SAM2_BUILD_CUDA=0` to skip, `SAM2_BUILD_ALLOW_ERRORS=0` to make failures fatal.
- **Do not run Python from the parent directory of the cloned repo.** `build_sam.py` raises a `RuntimeError` if it detects `sam2/sam2` on the path, because the repo name shadows the package. Run from the repo root or elsewhere.
- Download checkpoints (gitignored, not committed):
  ```bash
  cd checkpoints && ./download_ckpts.sh && cd ..
  ```

## Common workflows

### Inference (image)
```python
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor
predictor = SAM2ImagePredictor(build_sam2(
    "configs/sam2.1/sam2.1_hiera_l.yaml",
    "checkpoints/sam2.1_hiera_large.pt",
))
predictor.set_image(image)
masks, scores, _ = predictor.predict(point_coords=..., point_labels=...)
```
Or load from Hugging Face: `SAM2ImagePredictor.from_pretrained("facebook/sam2.1-hiera-large")`.

Note: config paths are Hydra search-path-relative (e.g. `configs/sam2.1/...`),
**not** filesystem-relative — the `sam2` package registers itself as a Hydra
config module in `sam2/__init__.py`.

### VOS evaluation
```bash
python ./tools/vos_inference.py \
  --sam2_cfg configs/sam2.1/sam2.1_hiera_b+.yaml \
  --sam2_checkpoint ./checkpoints/sam2.1_hiera_base_plus.pt \
  --base_video_dir ... --input_mask_dir ... --video_list_file ... \
  --output_mask_dir ./outputs/...
```
Then score with `sav_dataset/sav_evaluator.py`. See `tools/README.md`.

### Training / fine-tuning
```bash
python training/train.py \
  -c configs/sam2.1_training/sam2.1_hiera_b+_MOSE_finetune.yaml \
  --use-cluster 0 --num-gpus 8
```
`--use-cluster 1` plus `--num-nodes`/`--partition`/`--qos`/`--account` for SLURM.
Logs/checkpoints default to `./sam2_logs/`; monitor via TensorBoard. See `training/README.md`.

### Web demo
```bash
docker compose up --build      # frontend on :7262, backend on :7263 (needs NVIDIA GPU)
```
For local frontend dev: `cd demo/frontend && yarn install && yarn dev --port 7262`.
Backend supports MPS (Apple Silicon) — see `demo/README.md`. The demo backend is a
Flask + Strawberry GraphQL server; the frontend is Vite + React + Relay.

## Conventions

### Python
- **Formatting/linting is enforced by `ufmt`** (= `black` 24.2.0 + `usort` 1.0.2). CI (`.github/workflows/check_fmt.yml`) runs `ufmt check` over `sam2` and `tools` on PRs to `main`. Before committing Python changes:
  ```bash
  ufmt format sam2 tools          # or: ufmt check sam2 tools
  ```
- Every source file carries the Meta Apache-2.0 copyright header — preserve it and add it to new files.
- C/CUDA/C++ formatting follows `.clang-format`.
- Architecture changes belong in **Hydra YAML configs**, not in hardcoded instantiation.

### Frontend (`demo/frontend`)
- TypeScript + React 18, Vite build, **Relay** for GraphQL (run `yarn relay` to regenerate after schema changes; `yarn merge-schemas` merges GraphQL schemas).
- Lint: `yarn lint` (ESLint, `--max-warnings 0`). Build: `yarn build` (runs `tsc` then `vite build`).
- State via **jotai**; styling via **StyleX** + Tailwind/DaisyUI.

### The Forensic Dashboard (fork-specific)
- `demo/frontend/src/forensic/ForensicDashboard.tsx` is a self-contained, single-file React/TS component, routed at **`/forensic`** (`src/App.tsx`). It is **independent of the SAM 2 segmentation pipeline** — a glassmorphism "bento grid" investigation UI with four domains (Hoyle, Kniese, Artefacts, Financial), an Evidence Register table, and AI features (Analyze Delta / Draft Brief) backed by the Gemini API.
- It depends on `lucide-react` (added to `package.json` in this fork). Keep changes scoped to `src/forensic/` and the `/forensic` route; don't entangle it with the demo's Relay/GraphQL data layer.

## Git / contribution workflow in this environment

- **Active development branch for this work: `claude/claude-md-docs-AlFK5`.** Develop, commit, and push there. Create it locally if missing. Never push to `main` or another branch without explicit permission.
- Push with `git push -u origin claude/claude-md-docs-AlFK5`; retry network failures with exponential backoff.
- **Do not open a pull request unless explicitly asked.**
- Upstream contribution guidance (CLA, etc.) is in `CONTRIBUTING.md`; community standards in `CODE_OF_CONDUCT.md`.

## Pointers

- `README.md` — project overview, install, model cards, citation.
- `INSTALL.md` — exhaustive install + CUDA/troubleshooting guide.
- `RELEASE_NOTES.md` — SAM 2.0 vs 2.1 changes.
- `training/README.md`, `tools/README.md`, `sav_dataset/README.md`, `demo/README.md` — subsystem-specific docs.
- Licensing: code is **Apache 2.0** (`LICENSE`); the SA-V dataset and `cctorch` carry separate licenses (`sav_dataset/LICENSE*`, `LICENSE_cctorch`).
