# Language Chatbot - Modal Deployment

## Setup

1. Install Modal CLI:
```bash
pip install modal
```

2. Authenticate with Modal:
```bash
modal setup
```

3. (Optional) Create a HuggingFace secret for private models:
```bash
modal secret create huggingface-secret HF_TOKEN=your_token_here
```

## Deploy

Deploy the app:
```bash
modal deploy app.py
```

This will output a URL like: `https://your-username--language-chatbot-web-app.modal.run`

## Test Locally

Run a local test:
```bash
modal run app.py
```

## API Usage

The API is OpenAI-compatible:

```bash
curl -X POST https://your-url/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Korean",
    "messages": [
      {"role": "system", "content": "You are a Korean learning assistant."},
      {"role": "user", "content": "안녕하세요!"}
    ],
    "stream": true
  }'
```

## Update Frontend

Update your frontend endpoint URL to:
```typescript
const LLM_CONFIG = {
  endpointUrl: 'https://your-username--language-chatbot-web-app.modal.run/v1/chat/completions',
  // ...
};
```

## Costs

Modal charges per-second of compute:
- CPU: ~$0.0001/second
- The container stays warm for 5 minutes after last request
- First request after idle will have ~2-3s cold start

## GPU Option

For faster inference, change in `app.py`:
```python
@app.cls(
    gpu="T4",  # Add GPU
    # ...
)
```

And update model loading:
```python
self.llm = Llama(
    n_gpu_layers=-1,  # Use GPU
    # ...
)
```
