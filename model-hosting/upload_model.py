from huggingface_hub import login, HfApi, create_repo, upload_folder
import os
from dotenv import load_dotenv

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN_WRITE")
api = HfApi(token=HF_TOKEN)

MODEL_NAME="Qwen/Qwen2.5-7B-Instruct"
model_name_for_repo = MODEL_NAME.split('/')[-1]
OUTPUT_REPO = f"jiminaa/{model_name_for_repo}-language-QLoRA"

files = ["English", "Korean", "Spanish"]

for file in files:
    try:
        api.upload_folder(
            folder_path=file,
            repo_id=OUTPUT_REPO,
            path_in_repo=f"{file}",
            repo_type="model"
            )

        print(f"Success at uploading {file}")
    except Exception as e:
        print(f"Note: {e}")

