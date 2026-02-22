# Web app — Projective Sphere Pubkey Map

Static single-page app: an interactive 3D sphere showing secp256k1 public keys (from a collected list and/or user input) using the same projective sphere math as the algebraic foundations notebook.

## Purpose

- **Static site**; no backend at runtime.
- Load a static list of pubkeys from **collected-pubkeys.json**, map each to a point on the sphere, and render.
- Let the user paste one or more public keys (hex); map them to the sphere and show “where you are” with a distinct style (e.g. color, labels).

## Math

- All mapping logic is a **JavaScript port** of the pipeline in [../elliptic-curves/01-algebraic-foundations.ipynb](../../elliptic-curves/01-algebraic-foundations.ipynb):
  - secp256k1 constants (P_SEC, G).
  - Normalize (x, y) to (u, v) in [-π, π].
  - Inverse stereographic projection (u, v) → (X, Y, Z) on the unit sphere.
  - Optional lift (e.g. R_LIFT_DOT) so points sit slightly above the sphere.
- Pubkey parsing: support compressed (33-byte) and uncompressed (65-byte) hex; recover (x, y) and validate on-curve. Use BigInt for mod arithmetic so everything runs in the browser and user keys never leave the device.

## Where the data lives

- **collected-pubkeys.json**: The app expects this file at a path it can fetch when served (e.g. **public/collected-pubkeys.json** if using a tool that serves `public/` as static root). The collector writes to **../data/collected-pubkeys.json** (or directly to **web/public/**); copy or configure so the built/served app can load it.

## Running locally

- No backend required. Use any static server, for example:
  - **npx serve .** (or **npx serve public** if the app lives under **public/**)
  - **Vite**: `npm run dev` if the project is set up with Vite
- Open the page in the browser; the app fetches **collected-pubkeys.json** and renders the sphere. User input is handled entirely in the client.

For full implementation steps (math details, collector, order of work), see [../docs/IMPLEMENTATION.md](../docs/IMPLEMENTATION.md).
