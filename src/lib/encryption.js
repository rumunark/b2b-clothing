import nacl from 'tweetnacl';
import { encode, decode } from 'js-base64';

// ─── Base64 helpers (exported for keyManager) ────────────

export const uint8ArrayToBase64 = (array) => {
  const bin = Array.from(array, (b) => String.fromCharCode(b)).join('');
  return encode(bin);
};

export const base64ToUint8Array = (b64) => {
  const bin = decode(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

// ─── String helpers ──────────────────────────────────────

const stringToUint8Array = (str) => {
  const s = unescape(encodeURIComponent(str));
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
};

const uint8ArrayToString = (arr) =>
  decodeURIComponent(escape(String.fromCharCode.apply(null, arr)));

// ─── Message encrypt / decrypt ───────────────────────────

export function encryptMessage(message, peerPublicKey_b64, userPrivateKey_b64) {
  try {
    if (!peerPublicKey_b64 || !userPrivateKey_b64) throw new Error('Missing keys');

    const shared = nacl.box.before(
      base64ToUint8Array(peerPublicKey_b64),
      base64ToUint8Array(userPrivateKey_b64)
    );
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const encrypted = nacl.box.after(stringToUint8Array(message), nonce, shared);
    const full = new Uint8Array(nonce.length + encrypted.length);
    full.set(nonce);
    full.set(encrypted, nonce.length);
    return uint8ArrayToBase64(full);
  } catch (e) {
    console.error('Encryption failed:', e.message);
    return null;
  }
}

export function decryptMessage(encrypted_b64, peerPublicKey_b64, userPrivateKey_b64) {
  try {
    if (!encrypted_b64 || !peerPublicKey_b64 || !userPrivateKey_b64) throw new Error('Missing params');

    const shared = nacl.box.before(
      base64ToUint8Array(peerPublicKey_b64),
      base64ToUint8Array(userPrivateKey_b64)
    );
    const full = base64ToUint8Array(encrypted_b64);
    const decrypted = nacl.box.open.after(
      full.slice(nacl.box.nonceLength),
      full.slice(0, nacl.box.nonceLength),
      shared
    );
    if (!decrypted) throw new Error('Authentication failed');
    return uint8ArrayToString(decrypted);
  } catch (e) {
    console.log('Decryption failed:', e.message);
    return null;
  }
}