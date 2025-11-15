import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { supabase } from './supabaseClient';
import { encode, decode } from 'js-base64'; 

const uint8ArrayToBase64 = (array) => {
  // Convert Uint8Array to binary string, then encode to Base64
  const binaryString = Array.from(array, byte => String.fromCharCode(byte)).join('');
  return encode(binaryString);
};

const base64ToUint8Array = (base64String) => {
  // Decode Base64 to binary string, then convert to Uint8Array
  const binaryString = decode(base64String);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// String conversion helpers (for message content)
const stringToUint8Array = (str) => {
  const encoded = unescape(encodeURIComponent(str));
  const arr = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) {
    arr[i] = encoded.charCodeAt(i);
  }
  return arr;
};

const uint8ArrayToString = (arr) => {
  const decoded = String.fromCharCode.apply(null, arr);
  return decodeURIComponent(escape(decoded));
};

export async function generateAndStoreKeys(userId) {
  try {
    const keyPair = nacl.box.keyPair();
    
    // Validate key length before encoding
    if (keyPair.publicKey.length !== 32 || keyPair.secretKey.length !== 32) {
      throw new Error('Generated keys are not 32 bytes long');
    }

    const publicKey_b64 = uint8ArrayToBase64(keyPair.publicKey);
    const secretKey_b64 = uint8ArrayToBase64(keyPair.secretKey);

    await SecureStore.setItemAsync(`private_key_${userId}`, secretKey_b64);

    const { error } = await supabase
      .from('profiles')
      .update({ public_key: publicKey_b64 })
      .eq('id', userId);

    if (error) throw error;

    console.log(`Keys generated for user ${userId}: public=${publicKey_b64}`);
    return { publicKey: publicKey_b64, privateKey: secretKey_b64 };
  } catch (error) {
    console.error('Key generation error:', error);
    throw error;
  }
}

export async function getPublicKey(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('public_key')
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    const publicKey = data?.public_key;
    
    // Validate key exists and has correct length when decoded
    if (publicKey) {
      const keyBytes = base64ToUint8Array(publicKey);
      if (keyBytes.length !== 32) {
        console.error(`Invalid public key size: ${keyBytes.length} bytes (expected 32)`);
        return null;
      }
    }
    
    return publicKey;
  } catch (error) {
    console.error('Error fetching public key:', error);
    return null;
  }
}

export async function getPrivateKey(userId) {
  try {
    const privateKey_b64 = await SecureStore.getItemAsync(`private_key_${userId}`);
    
    if (privateKey_b64) {
      const keyBytes = base64ToUint8Array(privateKey_b64);
      if (keyBytes.length !== 32) {
        console.error(`Invalid private key size: ${keyBytes.length} bytes (expected 32)`);
        return null;
      }
    }
    
    return privateKey_b64;
  } catch (error) {
    console.error('Error fetching private key:', error);
    throw error;
  }
}

export function encryptMessage(message, recipientPublicKey_b64, senderPrivateKey_b64) {
  try {
    // Validate inputs
    if (!recipientPublicKey_b64 || !senderPrivateKey_b64) {
      throw new Error('Missing keys for encryption');
    }

    const recipientPublicKey = base64ToUint8Array(recipientPublicKey_b64);
    const senderPrivateKey = base64ToUint8Array(senderPrivateKey_b64);

    if (recipientPublicKey.length !== 32 || senderPrivateKey.length !== 32) {
      throw new Error(`Key size mismatch: public=${recipientPublicKey.length}, private=${senderPrivateKey.length} (both must be 32)`);
    }

    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageUint8 = stringToUint8Array(message);

    const encrypted = nacl.box(
      messageUint8,
      nonce,
      recipientPublicKey,
      senderPrivateKey
    );

    const fullMessage = new Uint8Array(nonce.length + encrypted.length);
    fullMessage.set(nonce);
    fullMessage.set(encrypted, nonce.length);

    return uint8ArrayToBase64(fullMessage);
  } catch (e) {
    console.error("Encryption failed:", e.message);
    return null;
  }
}

export function decryptMessage(encryptedMessage_b64, senderPublicKey_b64, recipientPrivateKey_b64) {
  try {
    if (!encryptedMessage_b64 || !senderPublicKey_b64 || !recipientPrivateKey_b64) {
      throw new Error('Missing parameters for decryption');
    }

    const senderPublicKey = base64ToUint8Array(senderPublicKey_b64);
    const recipientPrivateKey = base64ToUint8Array(recipientPrivateKey_b64);

    if (senderPublicKey.length !== 32 || recipientPrivateKey.length !== 32) {
      throw new Error(`Key size mismatch: public=${senderPublicKey.length}, private=${recipientPrivateKey.length} (both must be 32)`);
    }

    const fullMessage = base64ToUint8Array(encryptedMessage_b64);
    const nonce = fullMessage.slice(0, nacl.box.nonceLength);
    const message = fullMessage.slice(nacl.box.nonceLength);

    const decrypted = nacl.box.open(
      message,
      nonce,
      senderPublicKey,
      recipientPrivateKey
    );

    if (!decrypted) {
      throw new Error("Failed to decrypt message - authentication failed");
    }

    return uint8ArrayToString(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e.message);
    return null;
  }
}