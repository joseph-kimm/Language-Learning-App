# Language Learning App

An AI-powered language learning chatbot for practicing English, Korean, and Spanish through natural conversation. Features real-time streaming responses, fine-tuned language models, and adaptive bot personalities.

[Live Demo](https://language-buddy-app-six-mu.vercel.app/)

```
language-learning-app/
├── chatbot/          # Next.js full-stack web app
├── model-hosting/    # Modal.com LLM inference server
└── model-training/   # Fine-tuning pipeline (QLoRA) + dataset generation
```

---

## Tech Stack

| Layer     | Technology                                                                 |
| --------- | -------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router), React 19, TypeScript                              |
| API       | GraphQL — Apollo Server 5 + Apollo Client 4                                |
| Real-time | Server-Sent Events + Redis pub/sub (Upstash)                               |
| Database  | MongoDB Atlas (Mongoose)                                                   |
| Auth      | NextAuth v5 — Google OAuth + email/password                                |
| LLM       | Tranformer library with LoRA adapters on Modal.com (OpenAI-compatible API) |
| Training  | LoRA fine-tuning                                                           |

---

## Features

- Real-time streaming bot responses via SSE
- Multiple languages — English, Korean, Spanish
- Bot personalities — Default, Calm, Curious, Hype, Playful
- Text-to-speech and speech-to-text
- Sentence improvement and message explanation
- User profiles — proficiency, native language, interests, goals
- Persistent chat history

---

## Getting Started

### Web App

```bash
cd chatbot
pnpm install
cp .env.example .env.local
pnpm dev
```

Key environment variables:

```env
MONGODB_URI=
REDIS_URL=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXT_PUBLIC_GRAPHQL_URL=
NEXT_PUBLIC_GRAPHQL_SSE_URL=
LLM_URL=
```

### Model Server

```bash
cd model-hosting
pip install modal
modal setup
modal deploy app.py
```

Set the deployed endpoint URL as `LLM_URL` in your `.env.local`.

### Model Training

```
model-training/
├── dataset/               # JSONL training data per language + generator script
├── finetuning/            # QLoRA fine-tuning notebook
└── quantization/          # GGUF conversion for llama.cpp
```

1. Generate a dataset with `dataset/dataset_generator.py` or use the dataset available in `dataset` folder
2. Fine-tune with `finetuning/finetuning-lora.ipynb` (kaggle notebook recommended)
3. Upload the adapter weights in HF and deploy `model-hosting/app_transformers.py`

---

## License

MIT
