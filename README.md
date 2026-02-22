# Projective Sphere Pubkey Map

A small website that shows secp256k1 public keys on the **projective sphere**: every point on Bitcoin’s curve is mapped to a point on a 3D sphere via inverse stereographic projection. Visitors can see a map of collected public keys and paste one or more of their own to see *where you are* on the sphere.

## Live site

**[https://esixce.github.io/bitcoin-sphere/](https://esixce.github.io/bitcoin-sphere/)** — view the sphere in the browser (GitHub Pages). To enable: repo **Settings → Pages → Source**: Deploy from a **branch**; branch **main**, folder **/ (root)**; Save.

## Goal

- **Map view**: Plot many public keys (collected from the blockchain) as points on an interactive 3D sphere.
- **Your keys**: Input one or more public keys (hex); the app shows their positions on the same sphere.

The math (normalization of curve coordinates to [-π, π], then inverse stereographic projection onto the unit sphere) is the same as in the algebraic foundations notebook.

## Math source

The pipeline is defined and visualized here:

- [elliptic-curves/01-algebraic-foundations.ipynb](../elliptic-curves/01-algebraic-foundations.ipynb) — secp256k1 parameters, scaling, `inv_stereo`, and the sphere plot (e.g. the cell that plots G, kG, and the point at infinity).

## How to build it

Implementation is described step by step in:

- **[docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** — math pipeline, collector (reading block `.dat` files), web app design, and suggested order of work.

Subfolders:

- **collector/** — script(s) that read Bitcoin Core’s `blk*.dat` files and produce a static list of pubkeys. See [collector/README.md](collector/README.md).
- **web/** — static site (sphere + static list + user key input). See [web/README.md](web/README.md).
- **data/** — holds `collected-pubkeys.json` produced by the collector (or document copying it into `web/public/` for the app).

Follow the implementation guide and the per-folder READMEs to build the project step by step.

## Earth layer (optional)

The Earth layer uses **Equirectangular-projection.jpg** at the repo root (flat equirectangular world map, public domain from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Equirectangular-projection.jpg)). The app loads it and maps it onto the sphere (North = mathematical pole, Greenwich = positive X). If the image fails to load, a procedural fallback is shown. **Note:** The real map texture is only applied when the app is served over HTTP(S) (e.g. `npx serve .` or GitHub Pages). Opening `index.html` directly as a file may show the procedural fallback due to browser security (canvas tainting).
