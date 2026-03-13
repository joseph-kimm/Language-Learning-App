import modal
import os

# Define the Modal app
app = modal.App("language-chatbot-transformers")

# Model configurations
BASE_MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
ADAPTER_REPO_ID = "jiminaa/Qwen2.5-7B-Instruct-language-QLoRA"
MODEL_DIR = "/models"


def download_model():
    """Download model during image build."""
    import os
    from huggingface_hub import snapshot_download

    os.makedirs(MODEL_DIR, exist_ok=True)
    snapshot_download(
        repo_id=BASE_MODEL_ID,
        local_dir=f"{MODEL_DIR}/base",
        token=os.environ.get("HF_TOKEN"),
    )


def download_adapters():
    """Download adapters during image build."""
    import os
    from huggingface_hub import snapshot_download

    snapshot_download(
        repo_id=ADAPTER_REPO_ID,
        local_dir=os.path.join(MODEL_DIR, "adapters"),
        token=os.environ.get("HF_TOKEN"),
    )


# Bump this to force a full image + snapshot rebuild
IMAGE_VERSION = "v4"

# Define the image with CUDA PyTorch for GPU inference
# creating an Docker container
image = (
    modal.Image.debian_slim(python_version="3.10")
    .env({"IMAGE_VERSION": IMAGE_VERSION})
    .pip_install(
        "torch",
        "transformers",
        "peft",
        "accelerate",
        "huggingface-hub",
        "fastapi[standard]",
    )
    .run_function(download_model)
    .run_function(download_adapters)
)

# Adapter configurations (set to None to disable)
ADAPTERS = {
    "ENGLISH": "English",
    "KOREAN": "Korean",
    "SPANISH": "Spanish",
}
DEFAULT_MODEL = "base"

# Local path for the pre-downloaded model
MODEL_PATH = f"{MODEL_DIR}/base"

# modal class with specification
@app.cls(
    image=image,
    gpu="L4",
    memory=16384,  # 16GB system RAM (required for bf16)
    scaledown_window=300,  # Keep warm for 5 minutes
    enable_memory_snapshot=True,
    experimental_options={"enable_gpu_snapshot": True},
    max_containers=3
)

class Model:

    # runs only the first time
    # then saves a snapshot
    @modal.enter(snap=True)
    def load_base(self):
        
        """Load base model, tokenizer, and all adapters — everything gets snapshotted."""
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from peft import PeftModel
        import torch
        import time

        print("Loading tokenizer from pre-downloaded model...")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

        # bf16 instead of NF4 — required for GPU snapshot compatibility.
        # Qwen2.5-7B in bf16 uses ~14GB VRAM, within the L4's 24GB.
        print("Loading base model in bf16...")
        start = time.time()
        self.base_model = AutoModelForCausalLM.from_pretrained(
            MODEL_PATH,
            torch_dtype=torch.bfloat16,
            device_map="auto",
        )
        print(f"Base model loaded in {time.time() - start:.2f}s")

        # Load all adapters as named adapters into a single PeftModel.
        # Using one PeftModel with named adapters avoids the bug where calling
        # PeftModel.from_pretrained multiple times on the same base_model object
        # causes each adapter to overwrite the previous "default" adapter.
        self.peft_model = None
        self.loaded_adapters = set()

        for adapter_name, adapter_path in ADAPTERS.items():
            adapter_full_path = os.path.join(MODEL_DIR, "adapters", adapter_path)
            if os.path.exists(adapter_full_path):
                print(f"Loading adapter: {adapter_name}...")
                start = time.time()
                if self.peft_model is None:
                    self.peft_model = PeftModel.from_pretrained(
                        self.base_model,
                        adapter_full_path,
                        adapter_name=adapter_name,
                    )
                else:
                    self.peft_model.load_adapter(adapter_full_path, adapter_name=adapter_name)
                self.loaded_adapters.add(adapter_name)
                print(f"{adapter_name} adapter loaded in {time.time() - start:.2f}s")
            else:
                print(f"Adapter not found: {adapter_full_path}, skipping...")

        print(f"Loaded adapters: {self.loaded_adapters}")

    # runs every time
    @modal.enter()
    def on_restore(self):
        """After snapshot restore: re-create the threading lock and warmup the GPU."""
        # threading.Lock cannot be snapshotted, so it must be re-created here.
        # This runs on both cold starts (after snap=True) and snapshot restores.
        import threading
        self._adapter_lock = threading.Lock()

        self._generate_text(DEFAULT_MODEL, "Hi", max_new_tokens=1)
        print("Container restored and ready to serve.")

    def _generate_text(self, model_name: str, prompt: str, max_new_tokens: int = 256, temperature: float = 0.7):
        """Internal generation method. Acquires adapter lock for the full duration."""
        import torch

        inputs = self.tokenizer(prompt, return_tensors="pt")

        with self._adapter_lock:
            if model_name in self.loaded_adapters and self.peft_model is not None:
                self.peft_model.set_adapter(model_name)
                model = self.peft_model
                inputs = {k: v.to(model.device) for k, v in inputs.items()}
                with torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_new_tokens=max_new_tokens,
                        temperature=temperature,
                        do_sample=temperature > 0,
                        pad_token_id=self.tokenizer.eos_token_id,
                    )
            else:
                # Fallback to base model with all adapters disabled
                model = self.peft_model if self.peft_model is not None else self.base_model
                inputs = {k: v.to(model.device) for k, v in inputs.items()}
                ctx = model.disable_adapter() if self.peft_model is not None else torch.no_grad()
                with ctx, torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_new_tokens=max_new_tokens,
                        temperature=temperature,
                        do_sample=temperature > 0,
                        pad_token_id=self.tokenizer.eos_token_id,
                    )

        return self.tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)

    def _format_messages(self, messages: list[dict]) -> str:
        """Format messages into a prompt string using chat template."""
        return self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )

    # methods are callable outside the container
    @modal.method()
    def generate(self, messages: list[dict], max_tokens: int = 256, temperature: float = 0.7, model_name: str = DEFAULT_MODEL):
        """Generate a complete response (non-streaming)."""
        prompt = self._format_messages(messages)
        return self._generate_text(model_name, prompt, max_tokens, temperature)

    @modal.method()
    def generate_stream(self, messages: list[dict], max_tokens: int = 256, temperature: float = 0.7, model_name: str = DEFAULT_MODEL):
        """Generate streaming response using TextIteratorStreamer."""
        from transformers import TextIteratorStreamer
        from threading import Thread
        import time

        prompt = self._format_messages(messages)

        print(f"[Model: {model_name}] Messages: {messages}", flush=True)
        start = time.time()

        inputs = self.tokenizer(prompt, return_tensors="pt")

        streamer = TextIteratorStreamer(self.tokenizer, skip_prompt=True, skip_special_tokens=True)

        first_token_time = None
        token_count = 0

        # Hold the adapter lock for the full streaming duration to prevent
        # another request from switching adapters mid-generation.
        with self._adapter_lock:
            if model_name in self.loaded_adapters and self.peft_model is not None:
                self.peft_model.set_adapter(model_name)
                model = self.peft_model
            else:
                model = self.peft_model if self.peft_model is not None else self.base_model

            inputs = {k: v.to(model.device) for k, v in inputs.items()}

            generation_kwargs = {
                **inputs,
                "max_new_tokens": max_tokens,
                "temperature": temperature,
                "do_sample": temperature > 0,
                "pad_token_id": self.tokenizer.eos_token_id,
                "streamer": streamer,
            }

            thread = Thread(target=model.generate, kwargs=generation_kwargs)
            thread.start()

            for token in streamer:
                if token:
                    if first_token_time is None:
                        first_token_time = time.time()
                        print(f"[Prefill: {first_token_time - start:.2f}s]", flush=True)
                    token_count += 1
                    print(token, end="", flush=True)
                    yield token

            thread.join()

        total_time = time.time() - start
        gen_time = total_time - (first_token_time - start) if first_token_time else 0
        if token_count > 0 and gen_time > 0:
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

    api = FastAPI(title="Language Chatbot API (Transformers)")
    model = Model()

    available_models = ["base"] + list(ADAPTERS.keys())

    class Message(BaseModel):
        role: Literal["system", "user", "assistant"]
        content: str

    class ChatCompletionRequest(BaseModel):
        model: str = "base"
        messages: List[Message]
        max_tokens: Optional[int] = 256
        temperature: Optional[float] = 0.7
        stream: Optional[bool] = True

    @api.get("/")
    def health():
        return {"status": "ok", "models": available_models, "default": DEFAULT_MODEL, "backend": "transformers"}

    @api.get("/v1/models")
    def list_models():
        return {
            "object": "list",
            "data": [{"id": name, "object": "model"} for name in available_models]
        }

    @api.post("/v1/chat/completions")
    async def chat_completions(request: ChatCompletionRequest):
        messages_dicts = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        model_name = request.model if request.model in available_models else DEFAULT_MODEL

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

    available = ["base"] + list(ADAPTERS.keys())
    print(f"Available models: {available}")
    print(f"Testing streaming generation with '{DEFAULT_MODEL}' model...")
    for token in model.generate_stream.remote_gen(messages, model_name=DEFAULT_MODEL):
        print(token, end="", flush=True)
    print()
