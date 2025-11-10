import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { supabase } from './supabaseClient';
import { encode, decode } from 'js-base64'; 
import { TextEncoder, TextDecoder } from 'text-encoding'; 

const base64ToUint8Array = (base64String) => {
  return new Uint8Array(decode(base64String).split(',').map(Number));
};

const uint8ArrayToBase64 = (array) => {
  return encode(String.fromCharCode.apply(null, array));
};

export async function generateAndStoreKeys(userId) {
  try {
    // Generate key pair
    const keyPair = nacl.box.keyPair();

    // Encode keys to Base64
    const publicKey_b64 = uint8ArrayToBase64(keyPair.publicKey);
    const secretKey_b64 = uint8ArrayToBase64(keyPair.secretKey);

    // Store private key on device
    await SecureStore.setItemAsync(`private_key_${userId}`, secretKey_b64);

    // Update user profile with public key
    const { error } = await supabase
      .from('profiles')
      .update({ public_key: publicKey_b64 })
      .eq('id', userId);

    if (error) throw error;

    console.log(`Keys generated and stored for user ${userId}`);
    return { publicKey: publicKey_b64, privateKey: secretKey_b64 };
  } catch (error) {
    console.error('Error generating and storing keys:', error);
    throw error;
  }
}

export async function getPublicKey(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('public_key')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching public key:', error);
    return null;
  }
  return data?.public_key;
}

export async function getPrivateKey(userId) {
  try {
    const privateKey_b64 = await SecureStore.getItemAsync(`private_key_${userId}`);
    return privateKey_b64;
  } catch (error) {
    console.error('Error fetching private key:', error);
    throw error;
  }
}

export function encryptMessage(message, recipientPublicKey_b64, senderPrivateKey_b64) {
  try {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageUint8 = new TextEncoder().encode(message);

    const recipientPublicKey = base64ToUint8Array(recipientPublicKey_b64);
    const senderPrivateKey = base64ToUint8Array(senderPrivateKey_b64);

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
    console.error("Encryption failed:", e);
    return null;
  }
}

export function decryptMessage(encryptedMessage_b64, senderPublicKey_b64, recipientPrivateKey_b64) {
  try {
    const fullMessage = base64ToUint8Array(encryptedMessage_b64);
    const nonce = fullMessage.slice(0, nacl.box.nonceLength);
    const message = fullMessage.slice(nacl.box.nonceLength);

    const senderPublicKey = base64ToUint8Array(senderPublicKey_b64);
    const recipientPrivateKey = base64ToUint8Array(recipientPrivateKey_b64);

    const decrypted = nacl.box.open(
      message,
      nonce,
      senderPublicKey,
      recipientPrivateKey
    );

    if (!decrypted) {
      throw new Error("Failed to decrypt message.");
    }

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}