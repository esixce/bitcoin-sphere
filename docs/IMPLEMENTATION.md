# Implementation Guide — Projective Sphere Pubkey Map

This document describes everything that needs to be implemented so the project can be built step by step. No code is provided here; it is the single source of truth for the implementation.

---

## 1. Math and pipeline (from the notebook)

The visualization uses the same pipeline as [../elliptic-curves/01-algebraic-foundations.ipynb](../../elliptic-curves/01-algebraic-foundations.ipynb).

### 1.1 secp256k1 constants

- **P_SEC** (field prime): `0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F`
- **N_SEC** (group order): used if you need scalar bounds; not required for mapping a point to the sphere.
- **Generator G**:  
  - GX = `0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798`  
  - GY = `0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8`
- Curve: **y² = x³ + 7** (mod P_SEC).

### 1.2 Normalization: (x, y) → (u, v) in [-π, π]

- `scale_sec = 2 * π / P_SEC`
- `u = (x - P_SEC/2) * scale_sec`
- `v = (y - P_SEC/2) * scale_sec`

Coordinates are treated as uniformly distributed mod P; centering and scaling to [-π, π] gives a consistent scatter on the plane before projection.

### 1.3 Inverse stereographic projection: (u, v) → (X, Y, Z) on unit sphere

- North pole (0, 0, 1) is the projection centre; (0, 0) on the plane maps to the south pole.
- `d = u² + v² + 1`
- `X = 2*u/d`, `Y = 2*v/d`, `Z = (u² + v² - 1)/d`

Optionally multiply (X, Y, Z) by a constant (e.g. **R_LIFT_DOT = 1.02**) so points sit slightly above the sphere surface for visibility.

### 1.4 Public key formats and recovering (x, y)

- **Compressed (33 bytes)**: 1 byte prefix `0x02` (y even) or `0x03` (y odd), then 32-byte x (big-endian).  
  - Compute y from the curve: y² = x³ + 7 (mod P_SEC). For **p ≡ 3 (mod 4)**, use **y = x^((p+1)/4) mod p** (then take the unique square root that exists). Adjust y so its parity matches the prefix: if the prefix demands odd y and y is even, use y = P_SEC - y (and vice versa).
- **Uncompressed (65 bytes)**: 1 byte `0x04`, then 32-byte x, then 32-byte y. Use (x, y) directly after verifying the point is on the curve (y² ≡ x³ + 7 mod P).

All of this can run in the browser using BigInt for mod arithmetic so that user-typed keys never leave the device.

---

## 2. Collector: read block `.dat` files (not RPC)

The collector produces a static list of public keys by reading the node’s block files from disk. This is much faster than RPC: sequential reads over `blk*.dat`, no round-trips or block decoding on the node side.

### 2.1 Where blocks live

- Bitcoin Core stores blocks in **&lt;datadir&gt;/blocks/** (or the path given by **-blocksdir**).
- Files are named **blkNNNNN.dat** (e.g. blk00000.dat, blk00001.dat).
- Block file format: **4-byte magic** (network/version dependent) + **4-byte block size** (little-endian) + **raw block** (serialized block message).
- Optionally note: block file format may change (e.g. versioned magic); recent Core may XOR block files (see release notes). The collector must handle the format actually used (e.g. read Core docs or source for current layout).

### 2.2 What to extract

Parse each block, then for every transaction:

- **P2PK outputs**: scriptPubKey is `&lt;pubkey&gt; OP_CHECKSIG`. The pubkey is a 33- or 65-byte push; extract it and add to the set (normalize to compressed if desired).
- **P2PKH**: the public key is not in the output; it appears in the **input** that spends the output — in scriptSig (legacy) or in the **witness** when the spend is SegWit. So when processing a transaction, for each input, try to parse scriptSig and/or witness and pull out a 33- or 65-byte pubkey where applicable.
- **P2WPKH**: scriptPubKey is OP_0 &lt;20-byte hash&gt;. The **32-byte public key** appears in the **witness** when the output is spent (typically first push after the signature). Extract it from the spending transaction’s input witness.

Deduplicate (e.g. by compressed hex) and output a single list. Prefer storing compressed (33-byte) hex for smaller JSON.

### 2.3 Output

- Single file, e.g. **collected-pubkeys.json**: a JSON array of hex strings, or an object like `{ "pubkeys": ["02...", "03..."], "source": "blk*.dat" }`.
- Config or CLI: allow specifying datadir (or blocksdir) and chain (mainnet vs signet) so the correct magic and path are used.
- Document where the file is written: e.g. **data/collected-pubkeys.json** in this repo. The web app can load from **web/public/collected-pubkeys.json** when serving statically — so either copy the file from data/ to web/public/ after collection, or configure the collector to write directly to web/public/.

---

## 3. Web app

- **Single-page app**; no backend at runtime.
- On load: fetch **collected-pubkeys.json** (from a path the app knows, e.g. `public/collected-pubkeys.json`). Parse each hex to (x, y), then (u, v), then inv_stereo to (X, Y, Z). Plot all points on a 3D sphere.
- **3D sphere**: Use Plotly.js or Three.js. Include:
  - Translucent sphere surface and optional grid (same style as the notebook).
  - One trace for all collected keys.
  - Optional: generator point **G** and point at infinity **𝒪** (e.g. at (0, 0, 1.05)) with labels.
  - User-added keys: separate trace(s), different color and/or labels (“My key 1”, “My key 2”).
- **User input**: Textarea or multiple inputs for public keys (hex, one per line or comma-separated). Button “Show on sphere”: parse, validate on-curve, map to sphere, add to the 3D view.
- **Copy**: Short line such as “Every secp256k1 public key is a point on this sphere. Paste your key to see where you sit.”
- **Privacy**: All parsing and math run in the browser; user-typed keys never leave the device.

---

## 4. Suggested order of implementation

1. **Shared sphere math in JS**: Implement secp256k1 constants, pubkey parsing (compressed + uncompressed), (x,y) → (u,v) → inv_stereo → (X,Y,Z). Optionally unit-test against the notebook (e.g. G → known sphere coords).
2. **Web app shell**: Single page with 3D sphere (Plotly.js or Three.js), load a **hardcoded small list** (e.g. G, 2G, …, 100G) to verify the pipeline and rendering.
3. **User input**: Add textarea + “Show on sphere”; parse and plot user keys; label “Your key(s)”.
4. **Collector**: Implement script that reads **blk*.dat** from the node’s blocks dir, extracts pubkeys as above, writes **collected-pubkeys.json** (e.g. to data/). Document how to run it (mainnet/signet, datadir/blocksdir).
5. **Wire static list**: Point the web app at **collected-pubkeys.json** (e.g. copy to web/public/ or configure path); show “all collected keys” plus user keys; optional legend/count.
6. **Polish**: Mark G and 𝒪 on the sphere, add short explanation text, link back to the notebook.

---

## 5. Data flow summary

- **Collection**: Node’s blocks dir (`blk*.dat`) → collector script → **collected-pubkeys.json** (e.g. in **data/** or **web/public/**).
- **Website**: On load, fetch **collected-pubkeys.json**; parse each hex → (x,y) → (u,v) → inv_stereo → (X,Y,Z); render. On user submit, parse user hex → (x,y) → same pipeline → add to view. Same math for both collected and user keys.
