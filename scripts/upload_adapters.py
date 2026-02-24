from huggingface_hub import HfApi, upload_folder, create_repo
import os

HF_USERNAME = "your-hf-username-or-org"   # e.g. "your-org"
REPO_NAME = "pediscreen-lora-adapters"    # choose a name
REPO_ID = f"{HF_USERNAME}/{REPO_NAME}"
LOCAL_FOLDER = "outputs/pediscreen_lora"  # where model.save_pretrained wrote adapters
PRIVATE = False   # or True if you want private

api = HfApi()

# create repo if it doesn't exist
try:
    api.create_repo(repo_id=REPO_ID, private=PRIVATE, repo_type="model")
    print(f"Created repo {REPO_ID}")
except Exception as e:
    print(f"Repo create maybe failed or already exists: {e}")

# upload the entire adapter folder contents to the root of the repo
try:
    upload_folder(
        folder_path=LOCAL_FOLDER,
        path_in_repo="",
        repo_id=REPO_ID,
        repo_type="model",
        token=None  # uses local auth from huggingface-cli login or HF_TOKEN env
    )
    print("Upload finished. Repo:", REPO_ID)
except Exception as e:
    print(f"Upload failed: {e}")
