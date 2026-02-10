#!/usr/bin/env python3
"""
Populate FAISS with embeddings from a local folder of images.
Usage:
  python tools/populate_faiss.py --images ./demo_images --host http://localhost:5000/embed --out_dir infra
"""
import os, argparse, base64, json, numpy as np, requests, pickle
import faiss

def get_embedding(embed_url, img_path):
    files = {"file": open(img_path, "rb")}
    r = requests.post(embed_url, files=files, timeout=10)
    r.raise_for_status()
    j = r.json()
    b = base64.b64decode(j["embedding_b64"])
    arr = np.frombuffer(b, dtype=np.float32).reshape(tuple(j["shape"]))
    return arr

def main(images_dir, embed_url, out_dir, dim=256):
    os.makedirs(out_dir, exist_ok=True)
    index = faiss.IndexFlatIP(dim)
    meta = []
    for i, fname in enumerate(sorted(os.listdir(images_dir))):
        if not fname.lower().endswith((".jpg",".jpeg",".png")): continue
        path = os.path.join(images_dir, fname)
        print("Embedding", path)
        emb = get_embedding(embed_url, path)
        faiss.normalize_L2(emb)
        index.add(emb)
        meta.append({"id": f"example-{i}", "source": fname})
    faiss.write_index(index, os.path.join(out_dir, "faiss_index.bin"))
    with open(os.path.join(out_dir, "faiss_meta.pkl"), "wb") as fh:
        pickle.dump(meta, fh)
    print("Saved index and meta to", out_dir)

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--images", required=True)
    p.add_argument("--host", default="http://127.0.0.1:5000/embed")
    p.add_argument("--out_dir", default="infra")
    args = p.parse_args()
    main(args.images, args.host, args.out_dir)
