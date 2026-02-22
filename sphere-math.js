/**
 * secp256k1 sphere math — same pipeline as elliptic-curves/01-algebraic-foundations.ipynb
 * Browser-runnable; uses BigInt for curve arithmetic.
 */
(function (global) {
  'use strict';

  const P_SEC = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
  const GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
  const GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;
  const R_LIFT_DOT = 1.02;

  const G = { x: GX, y: GY };

  function modInverse(a, m) {
    return powMod(a, m - 2n, m);
  }

  function powMod(base, exp, m) {
    if (exp === 0n) return 1n;
    let result = 1n;
    base = base % m;
    while (exp > 0n) {
      if (exp % 2n === 1n) result = (result * base) % m;
      exp = exp / 2n;
      base = (base * base) % m;
    }
    return result;
  }

  /** For p ≡ 3 (mod 4): returns one square root of a mod p. */
  function modSqrt(a, p) {
    const exp = (p + 1n) / 4n;
    return powMod(a, exp, p);
  }

  function onCurve(x, y) {
    const lhs = (y * y) % P_SEC;
    const rhs = (x * x * x + 7n) % P_SEC;
    return lhs === rhs;
  }

  /**
   * Parse hex pubkey (66 or 130 chars) → { x, y } BigInt.
   * Throws on invalid or not-on-curve.
   */
  function parsePubkey(hex) {
    let h = String(hex).replace(/^0x/i, '').toLowerCase();
    if (h.length % 2 !== 0) h = '0' + h;
    const len = h.length;
    if (len !== 66 && len !== 130) throw new Error('Pubkey must be 33 or 65 bytes (66 or 130 hex chars)');
    const bytes = [];
    for (let i = 0; i < len; i += 2) bytes.push(parseInt(h.slice(i, i + 2), 16));

    if (len === 66) {
      const prefix = bytes[0];
      if (prefix !== 0x02 && prefix !== 0x03) throw new Error('Compressed pubkey must start with 02 or 03');
      const xBytes = bytes.slice(1, 33);
      const x = BigInt('0x' + xBytes.map(b => b.toString(16).padStart(2, '0')).join(''));
      const y2 = (x * x * x + 7n) % P_SEC;
      let y = modSqrt(y2, P_SEC);
      if ((y & 1n) !== (prefix === 0x03 ? 1n : 0n)) y = (P_SEC - y) % P_SEC;
      if (!onCurve(x, y)) throw new Error('Point not on curve');
      return { x, y };
    }

    if (len === 130) {
      if (bytes[0] !== 0x04) throw new Error('Uncompressed pubkey must start with 04');
      const xBytes = bytes.slice(1, 33);
      const yBytes = bytes.slice(33, 65);
      const x = BigInt('0x' + xBytes.map(b => b.toString(16).padStart(2, '0')).join(''));
      const y = BigInt('0x' + yBytes.map(b => b.toString(16).padStart(2, '0')).join(''));
      if (!onCurve(x, y)) throw new Error('Point not on curve');
      return { x, y };
    }

    throw new Error('Invalid pubkey length');
  }

  /**
   * Map curve point (x, y) to sphere coords { x, y, z } (same as notebook).
   */
  function pointToSphere(x, y) {
    const scaleSec = (2 * Math.PI) / Number(P_SEC);
    const p = Number(P_SEC);
    const u = (Number(x) - p / 2) * scaleSec;
    const v = (Number(y) - p / 2) * scaleSec;
    const d = u * u + v * v + 1;
    let X = (2 * u) / d;
    let Y = (2 * v) / d;
    let Z = (u * u + v * v - 1) / d;
    X *= R_LIFT_DOT;
    Y *= R_LIFT_DOT;
    Z *= R_LIFT_DOT;
    return { x: X, y: Y, z: Z };
  }

  function pointNeg(p) {
    if (p === null) return null;
    return { x: p.x, y: (P_SEC - p.y) % P_SEC };
  }

  /** p1, p2 are { x, y } or null (infinity). Returns null for infinity. */
  function pointAdd(p1, p2) {
    if (p1 === null) return p2;
    if (p2 === null) return p1;
    const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
    if (x1 === x2 && y1 !== y2) return null;
    if (x1 === x2 && y1 === y2) return pointDouble(p1);
    const lam = ((y2 - y1) * modInverse(x2 - x1, P_SEC)) % P_SEC;
    const x3 = (lam * lam - x1 - x2) % P_SEC;
    const y3 = (lam * (x1 - x3) - y1) % P_SEC;
    return { x: (x3 + P_SEC) % P_SEC, y: (y3 + P_SEC) % P_SEC };
  }

  function pointDouble(p) {
    if (p === null) return null;
    const x1 = p.x, y1 = p.y;
    if (y1 === 0n) return null;
    const lam = (3n * x1 * x1 * modInverse(2n * y1, P_SEC)) % P_SEC;
    const x3 = (lam * lam - 2n * x1) % P_SEC;
    const y3 = (lam * (x1 - x3) - y1) % P_SEC;
    return { x: (x3 + P_SEC) % P_SEC, y: (y3 + P_SEC) % P_SEC };
  }

  function scalarMult(k, P) {
    if (P === null || k <= 0n) return null;
    k = k % P_SEC;
    if (k === 0n) return null;
    let result = null;
    let addend = P;
    while (k > 0n) {
      if (k % 2n === 1n) result = pointAdd(result, addend);
      addend = pointDouble(addend);
      k = k / 2n;
    }
    return result;
  }

  const sphereMath = {
    P_SEC,
    GX,
    GY,
    G,
    R_LIFT_DOT,
    modInverse,
    modSqrt,
    onCurve,
    parsePubkey,
    pointToSphere,
    pointNeg,
    pointAdd,
    pointDouble,
    scalarMult,
  };

  global.sphereMath = sphereMath;
  if (typeof module !== 'undefined' && module.exports) module.exports = sphereMath;
})(typeof window !== 'undefined' ? window : this);
