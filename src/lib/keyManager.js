import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { supabase } from './supabaseClient';
import { uint8ArrayToBase64, base64ToUint8Array } from './encryption';

// Lower to 10_000 during dev if login feels slow; use 100_000+ in production
const PBKDF2_ITERATIONS = 100_000;

// ─── Local key access ─────────────────────────────────────

export async function getPrivateKey(userId) {
  const b64 = await SecureStore.getItemAsync(`private_key_${userId}`);
  if (!b64) return null;
  return base64ToUint8Array(b64).length === 32 ? b64 : null;
}

export async function getPublicKey(userId) {
  try {
    const { data, error } = await supabase.rpc('get_public_key', {
      target_user_id: userId,
    });
    if (error) throw error;
    return data || null;
  } catch (e) {
    console.error('getPublicKey error:', e.message);
    return null;
  }
}

// ─── Passphrase wrapping (client-side, server never sees plaintext) ──

function wrapPrivateKey(privateKey_b64, passphrase) {
  const salt = nacl.randomBytes(32);
  const derived = pbkdf2(sha256, passphrase, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: nacl.secretbox.keyLength,
  });
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(base64ToUint8Array(privateKey_b64), nonce, derived);

  return {
    encrypted_private_key: uint8ArrayToBase64(encrypted),
    salt: uint8ArrayToBase64(salt),
    nonce: uint8ArrayToBase64(nonce),
  };
}

function unwrapPrivateKey(backup, passphrase) {
  const derived = pbkdf2(
    sha256,
    passphrase,
    base64ToUint8Array(backup.salt),
    { c: PBKDF2_ITERATIONS, dkLen: nacl.secretbox.keyLength }
  );
  const plain = nacl.secretbox.open(
    base64ToUint8Array(backup.encrypted_private_key),
    base64ToUint8Array(backup.nonce),
    derived
  );
  return plain ? uint8ArrayToBase64(plain) : null;
}

// ─── Edge function calls ──────────────────────────────────

async function backupToServer(privateKey_b64, publicKey_b64, passphrase) {
  const wrapped = wrapPrivateKey(privateKey_b64, passphrase);
  const { data, error } = await supabase.functions.invoke('backup-key', {
    body: { ...wrapped, public_key: publicKey_b64 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

async function recoverFromServer(passphrase) {
  const { data, error } = await supabase.functions.invoke('recover-key');
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.backup) return null;
  return unwrapPrivateKey(data.backup, passphrase);
}

// ─── Single entry point — call at login / signup only ─────

export async function ensureUserKeys(userId, passphrase) {
  let privateKey = await getPrivateKey(userId);

  // Step 1: If no local key, try server recovery
  if (!privateKey) {
    try {
      privateKey = await recoverFromServer(passphrase);
      if (privateKey) {
        await SecureStore.setItemAsync(`private_key_${userId}`, privateKey);
        console.log('Key recovered from server backup');
      }
    } catch (e) {
      console.warn('Server recovery failed:', e.message);
    }
  }

  // Step 2: If still no key, generate fresh
  if (!privateKey) {
    const kp = nacl.box.keyPair();
    privateKey = uint8ArrayToBase64(kp.secretKey);
    await SecureStore.setItemAsync(`private_key_${userId}`, privateKey);
    console.log('Generated new keypair');
  }

  // Step 3: Derive public key (single source of truth)
  const kp = nacl.box.keyPair.fromSecretKey(base64ToUint8Array(privateKey));
  const publicKey = uint8ArrayToBase64(kp.publicKey);

  // Step 4: Ensure server backup exists and matches
  //         (quick RPC read — expensive PBKDF2 only runs when backup is missing/stale)
  const serverPublicKey = await getPublicKey(userId);
  if (serverPublicKey !== publicKey) {
    await backupToServer(privateKey, publicKey, passphrase);
    console.log('Key backup created/updated');
  }

  return { privateKey, publicKey };
}