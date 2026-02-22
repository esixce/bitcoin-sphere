# Collector — Pubkeys from block `.dat` files

The collector reads Bitcoin Core’s raw block files from disk and extracts secp256k1 public keys into a single static JSON file. It does **not** use RPC; reading `blk*.dat` is much faster (sequential I/O, no round-trips).

## Data source

- **Input**: Block files in the node’s blocks directory.
- **Location**: Usually `<datadir>/blocks/` (or the path set by `-blocksdir`). Files are named **blkNNNNN.dat** (e.g. blk00000.dat, blk00001.dat).
- **Format**: Each block file contains a sequence of blocks. For each block the layout is:
  - **4 bytes**: magic number (network-dependent: mainnet, testnet, signet, etc.).
  - **4 bytes**: block size in bytes (little-endian).
  - **N bytes**: raw serialized block (same as in the network “block” message).

Transaction and script serialization follow the Bitcoin wire/serialization format (see Bitcoin Core docs or source). The collector must parse this to decode transactions and their inputs/outputs.

**Note**: Block file format may evolve (e.g. versioned magic, or XOR with a key in recent Core for blocksdir). Check release notes and the actual format used by your node so the collector handles it correctly.

## Where pubkeys appear

- **P2PK (scriptPubKey)**: Output script is `<pubkey> OP_CHECKSIG`. The pubkey is a 33- or 65-byte push; extract it directly.
- **P2PKH (scriptSig or witness)**: The public key is not in the output; it appears in the **input** that spends the output — in **scriptSig** for legacy spends, or in the **witness** when the spend is SegWit. Parse each input’s scriptSig and/or witness and look for a 33- or 65-byte push that is a valid secp256k1 pubkey.
- **P2WPKH (witness)**: Output is OP_0 &lt;20-byte hash&gt;. When spent, the **witness** contains (typically) two items: signature and **32-byte public key**. The second push is the pubkey (it may be 33-byte compressed in practice; handle both if needed).

Deduplicate by pubkey (e.g. normalize to compressed hex) and output a single list.

## Output

- **File**: e.g. **collected-pubkeys.json**.
- **Placement**: Either:
  - Write to **../data/collected-pubkeys.json** (then copy to **../web/public/collected-pubkeys.json** for the web app to load), or
  - Write directly to **../web/public/collected-pubkeys.json** if the app serves from that path.
- **Format**: JSON array of hex strings, e.g. `["02...", "03..."]`, or an object with a "pubkeys" array and optional metadata. Prefer compressed (33-byte) representation to keep the file smaller.

## Config / CLI

- Allow specifying **datadir** (or **blocksdir**) so the script knows where to find `blk*.dat`.
- Allow specifying **chain** (e.g. mainnet vs signet) so the correct magic bytes are used when parsing block files.

See the main [Implementation guide](../docs/IMPLEMENTATION.md) for the full pipeline and how the web app uses this file.
