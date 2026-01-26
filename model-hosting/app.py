import modal
import os

# Define the Modal app
app = modal.App("language-chatbot")

# Define the image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.10")
    .pip_install(
        "llama-cpp-python",
        "huggingface-hub",
        "fastapi[standard]",
    )
)

# Model configurations (1 base + 3 finetuned) - all in the same repo
HF_REPO_ID = "Qwen/Qwen2.5-7B-Instruct-GGUF"
# For split models, list all files - first file is used for loading (llama.cpp auto-loads the rest)
MODELS = {
    "base": [
        "qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf",
        "qwen2.5-7b-instruct-q4_k_m-00002-of-00002.gguf",
    ],
    #"en": ["finetuned-1.gguf"],
    #"es": ["finetuned-2.gguf"],
    #"ko": ["finetuned-3.gguf"],
}
DEFAULT_MODEL = "base"

# Create a volume to cache the model
model_cache = modal.Volume.from_name("llm-model-cache", create_if_missing=True)
MODEL_DIR = "/models"


def download_model(model_name: str) -> str:
    """Download a specific model from HuggingFace Hub. Returns path to first file."""
    from huggingface_hub import hf_hub_download

    filenames = MODELS[model_name]
    # Ensure filenames is a list (for backwards compatibility with single files)
    if isinstance(filenames, str):
        filenames = [filenames]

    # Download all files (needed for split models)
    for filename in filenames:
        model_path = os.path.join(MODEL_DIR, filename)
        if not os.path.exists(model_path):
            print(f"Downloading {filename}...")
            hf_hub_download(
                repo_id=HF_REPO_ID,
                filename=filename,
                local_dir=MODEL_DIR,
                token=os.environ.get("HF_TOKEN"),
            )

    # Return path to first file (llama.cpp auto-loads split parts)
    return os.path.join(MODEL_DIR, filenames[0])


def download_all_models() -> dict[str, str]:
    """Download all models and return their paths."""
    paths = {}
    for model_name in MODELS:
        paths[model_name] = download_model(model_name)
    return paths


@app.cls(
    image=image,
    volumes={MODEL_DIR: model_cache},
    cpu=4,
    memory=16384,  # 16GB RAM for 7B Q4 model (~5GB + KV cache + overhead)
    scaledown_window=300,  # Keep warm for 5 minutes
)

class Model:
    @modal.enter()
    def setup(self):
        """Load all models when container starts."""
        from llama_cpp import Llama
        import time

        model_paths = download_all_models()
        model_cache.commit()  # Persist the downloaded models

        self.llms = {}
        for model_name, model_path in model_paths.items():
            print(f"Loading {model_name} model...")
            self.llms[model_name] = Llama(
                model_path=model_path,
                n_ctx=1024,
                n_threads=4,  # Use all available CPUs for single model
                n_batch=1024,
                n_ubatch=512,
                use_mmap=True,
                verbose=False,
            )

        # Warmup all models
        print("Warming up models...")
        for model_name, llm in self.llms.items():
            start = time.time()
            llm.create_chat_completion(
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=1,
            )
            print(f"{model_name} warmup complete in {time.time() - start:.2f}s")

    def _get_llm(self, model_name: str):
        """Get LLM instance by name, fallback to default."""
        if model_name not in self.llms:
            model_name = DEFAULT_MODEL
        return self.llms[model_name]

    @modal.method()
    def generate(self, messages: list[dict], max_tokens: int = 256, temperature: float = 0.7, model_name: str = DEFAULT_MODEL):
        """Generate a complete response (non-streaming)."""
        llm = self._get_llm(model_name)
        response = llm.create_chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response["choices"][0]["message"]["content"]

    @modal.method()
    def generate_stream(self, messages: list[dict], max_tokens: int = 256, temperature: float = 0.7, model_name: str = DEFAULT_MODEL):
        """Generate streaming response."""
        import time

        llm = self._get_llm(model_name)
        print(f"[Model: {model_name}] Messages: {messages}", flush=True)
        start = time.time()
        first_token_time = None
        token_count = 0

        for chunk in llm.create_chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        ):
            delta = chunk["choices"][0]["delta"]
            if "content" in delta:
                if first_token_time is None:
                    first_token_time = time.time()
                    print(f"[Prefill: {first_token_time - start:.2f}s]", flush=True)
                token_count += 1
                print(delta["content"], end="", flush=True)
                yield delta["content"]

        total_time = time.time() - start
        gen_time = total_time - (first_token_time - start) if first_token_time else 0
        print(f"\n[Total: {total_time:.2f}s | Tokens: {token_count} | Speed: {token_count/gen_time:.1f} tok/s]", flush=True)


# FastAPI web endpoint for OpenAI-compatible API
@app.function(
    image=image,
    cpu=0.25,
    memory=256,
    scaledown_window=300,
)
@modal.asgi_app()
def web_app():
    from fastapi import FastAPI
    from fastapi.responses import StreamingResponse
    from pydantic import BaseModel
    from typing import List, Literal, Optional
    import json
    import uuid
    import time

    api = FastAPI(title="Language Chatbot API")
    model = Model()

    class Message(BaseModel):
        role: Literal["system", "user", "assistant"]
        content: str

    class ChatCompletionRequest(BaseModel):
        model: str = "default"
        messages: List[Message]
        max_tokens: Optional[int] = 256
        temperature: Optional[float] = 0.7
        stream: Optional[bool] = True

    @api.get("/")
    def health():
        return {"status": "ok", "models": list(MODELS.keys()), "default": DEFAULT_MODEL}

    @api.get("/v1/models")
    def list_models():
        return {
            "object": "list",
            "data": [{"id": name, "object": "model"} for name in MODELS.keys()]
        }

    @api.post("/v1/chat/completions")
    async def chat_completions(request: ChatCompletionRequest):
        messages_dicts = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        model_name = request.model if request.model in MODELS else DEFAULT_MODEL

        chat_id = f"chatcmpl-{uuid.uuid4().hex[:8]}"
        created = int(time.time())

        if not request.stream:
            # Non-streaming response
            content = model.generate.remote(
                messages_dicts,
                request.max_tokens or 256,
                request.temperature or 0.7,
                model_name,
            )
            return {
                "id": chat_id,
                "object": "chat.completion",
                "created": created,
                "model": request.model,
                "choices": [{
                    "index": 0,
                    "message": {"role": "assistant", "content": content},
                    "finish_reason": "stop"
                }]
            }

        # Streaming response
        def event_generator():
            try:
                for token in model.generate_stream.remote_gen(
                    messages_dicts,
                    request.max_tokens or 256,
                    request.temperature or 0.7,
                    model_name,
                ):
                    chunk = {
                        "id": chat_id,
                        "object": "chat.completion.chunk",
                        "created": created,
                        "model": request.model,
                        "choices": [{
                            "index": 0,
                            "delta": {"content": token},
                            "finish_reason": None
                        }]
                    }
                    yield f"data: {json.dumps(chunk)}\n\n"

                # Final chunk
                final_chunk = {
                    "id": chat_id,
                    "object": "chat.completion.chunk",
                    "created": created,
                    "model": request.model,
                    "choices": [{
                        "index": 0,
                        "delta": {},
                        "finish_reason": "stop"
                    }]
                }
                yield f"data: {json.dumps(final_chunk)}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                error_chunk = {"error": {"message": str(e), "type": "server_error"}}
                yield f"data: {json.dumps(error_chunk)}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    return api


# Local testing
@app.local_entrypoint()
def main():
    model = Model()

    messages = [
        {"role": "system", "content": "You are a helpful Korean learning assistant. Respond in Korean."},
        {"role": "user", "content": "안녕하세요!"}
    ]

    print(f"Available models: {list(MODELS.keys())}")
    print(f"Testing streaming generation with '{DEFAULT_MODEL}' model...")
    for token in model.generate_stream.remote_gen(messages, model_name=DEFAULT_MODEL):
        print(token, end="", flush=True)
    print()
