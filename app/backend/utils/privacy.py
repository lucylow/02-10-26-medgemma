import base64
import numpy as np
from nacl.public import PrivateKey, PublicKey, Box
from loguru import logger

def decrypt_embedding(encrypted_payload: dict, server_private_key_b64: str):
    """
    Decrypts an embedding encrypted with the server's public key.
    
    Args:
        encrypted_payload: Dict containing 'eph_pub', 'nonce', and 'cipher' (base64)
        server_private_key_b64: Base64 encoded server private key
        
    Returns:
        numpy.ndarray: Decrypted float32 array
    """
    try:
        # Decode private key
        server_priv_bytes = base64.b64decode(server_private_key_b64)
        server_priv = PrivateKey(server_priv_bytes)
        
        # Decode payload
        eph_pub = base64.b64decode(encrypted_payload["eph_pub"])
        nonce = base64.b64decode(encrypted_payload["nonce"])
        cipher = base64.b64decode(encrypted_payload["cipher"])
        
        # Decrypt
        box = Box(server_priv, PublicKey(eph_pub))
        plaintext = box.decrypt(cipher, nonce)
        
        # Convert to numpy array
        arr = np.frombuffer(plaintext, dtype=np.float32)
        return arr
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise ValueError(f"Decryption failed: {e}")
