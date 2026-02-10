import base64
import numpy as np
import requests
import json
from nacl.public import PrivateKey, PublicKey, Box

# 1. Generate keys (Simulating server setup)
priv = PrivateKey.generate()
pub = priv.public_key
server_priv_b64 = base64.b64encode(bytes(priv)).decode('ascii')
server_pub_b64 = base64.b64encode(bytes(pub)).decode('ascii')

print(f"Server Public Key: {server_pub_b64}")

# 2. Simulate Client-Side Encryption
def client_encrypt(embedding, server_pub_b64):
    server_pub_bytes = base64.b64decode(server_pub_b64)
    server_pub = PublicKey(server_pub_bytes)
    
    eph = PrivateKey.generate()
    eph_pub = eph.public_key
    
    nonce = np.random.bytes(24) # crypto_box_NONCEBYTES
    
    box = Box(eph, server_pub)
    cipher = box.encrypt(embedding.tobytes(), nonce)
    # Note: box.encrypt appends nonce to the beginning by default in PyNaCl if nonce is not provided, 
    # but if we provide it, it returns just the ciphertext.
    # Actually Box.encrypt(plaintext, nonce) returns (nonce + ciphertext) if nonce is None,
    # or just ciphertext if nonce is provided.
    
    return {
        "eph_pub": base64.b64encode(bytes(eph_pub)).decode('ascii'),
        "nonce": base64.b64encode(nonce).decode('ascii'),
        "cipher": base64.b64encode(cipher.ciphertext).decode('ascii')
    }

# Create fake embedding
dim = 256
original_embedding = np.random.rand(dim).astype(np.float32)

# Encrypt
encrypted_payload = client_encrypt(original_embedding, server_pub_b64)

# 3. Test Server-Side Decryption (using our utility)
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'app', 'backend'))
from utils.privacy import decrypt_embedding

try:
    decrypted_embedding = decrypt_embedding(encrypted_payload, server_priv_b64)
    
    # Verify
    np.testing.assert_array_almost_equal(original_embedding, decrypted_embedding)
    print("SUCCESS: Encryption/Decryption roundtrip verified!")
    print(f"Original (first 5): {original_embedding[:5]}")
    print(f"Decrypted (first 5): {decrypted_embedding[:5]}")
except Exception as e:
    print(f"FAILURE: {e}")
    import traceback
    traceback.print_exc()
