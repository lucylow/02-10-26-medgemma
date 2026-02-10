import sodium from "libsodium-wrappers";

/**
 * Encrypts a Float32Array embedding using the server's public key.
 * This ensures the embedding is protected in transit and at rest on the server
 * until explicitly decrypted for inference.
 * 
 * @param {Float32Array} float32Array - The L2-normalized embedding from on-device model.
 * @param {string} serverPublicKeyBase64 - The server's public key (Curve25519) as base64.
 * @returns {Promise<Object>} - The encrypted payload { eph_pub, nonce, cipher } in base64.
 */
export async function encryptEmbedding(float32Array, serverPublicKeyBase64) {
  await sodium.ready;
  
  // 1. Decode server public key
  const serverPubKey = sodium.from_base64(serverPublicKeyBase64, sodium.base64_variants.ORIGINAL);
  
  // 2. Convert Float32Array to raw bytes
  const plainBytes = new Uint8Array(float32Array.buffer);
  
  // 3. Create ephemeral keypair for this encryption (Perfect Forward Secrecy)
  const eph = sodium.crypto_box_keypair();
  
  // 4. Generate random nonce
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  
  // 5. Encrypt: crypto_box(message, nonce, pk, sk)
  const cipher = sodium.crypto_box(plainBytes, nonce, serverPubKey, eph.privateKey);
  
  // 6. Return payload
  return {
    eph_pub: sodium.to_base64(eph.publicKey, sodium.base64_variants.ORIGINAL),
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
    cipher: sodium.to_base64(cipher, sodium.base64_variants.ORIGINAL)
  };
}

/**
 * Example of how to send the encrypted embedding to the PediScreen API
 */
export async function sendEncryptedInference(caseData, float32Array, serverPublicKeyBase64, apiUrl) {
  const encrypted = await encryptEmbedding(float32Array, serverPublicKeyBase64);
  
  const payload = {
    ...caseData,
    encrypted_embedding: encrypted,
    shape: [1, float32Array.length]
  };
  
  const response = await fetch(`${apiUrl}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  return response.json();
}
