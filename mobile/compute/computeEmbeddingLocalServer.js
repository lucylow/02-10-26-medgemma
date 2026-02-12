/**
 * Compute embedding via local MedSigLIP embed server.
 * Server: uvicorn server.embed_server:app --host 0.0.0.0 --port 5000
 * On Android: use http://10.0.2.2:5000 for emulator, or device IP for physical
 */
const EMBED_SERVER_URL =
  process.env.EMBED_SERVER_URL || "http://127.0.0.1:5000";

export async function computeEmbeddingLocalServer(imageUri) {
  const uri = imageUri.replace("file://", "");
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "image.jpg",
  });

  const resp = await fetch(`${EMBED_SERVER_URL}/embed`, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (!resp.ok) {
    throw new Error(`Embed server error: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  return {
    embeddingB64: data.embedding_b64,
    shape: data.shape || [1, 256],
  };
}
