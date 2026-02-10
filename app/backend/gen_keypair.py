import base64
from nacl.public import PrivateKey

def gen():
    """Generates a new Curve25519 keypair for encryption."""
    priv = PrivateKey.generate()
    pub = priv.public_key
    
    priv_b64 = base64.b64encode(bytes(priv)).decode('ascii')
    pub_b64 = base64.b64encode(bytes(pub)).decode('ascii')
    
    return priv_b64, pub_b64

if __name__ == "__main__":
    priv_b64, pub_b64 = gen()
    print("--- PediScreen AI Privacy Key Generation ---")
    print("\nPRIVATE_KEY_B64 (Keep this secret! Set as SERVER_PRIVATE_KEY_B64 env var):")
    print(priv_b64)
    print("\nPUBLIC_KEY_B64 (Share this with React Native clients):")
    print(pub_b64)
    print("\n-------------------------------------------")
