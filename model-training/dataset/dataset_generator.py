#!/usr/bin/env python3
"""
Dataset Generator for Language Learning Conversations
Runs continuously to generate training data for AI language conversational partner.
"""

import os
import sys
import argparse
import json
import random
import logging
import time
from datetime import datetime
from google import genai
from google.genai import types

# Custom logging filter to suppress unwanted messages
class SuppressSpecificMessages(logging.Filter):
    def filter(self, record):
        # Suppress AFC (Automatic Function Calling) messages
        if "AFC is enabled" in record.getMessage():
            return False
        return True

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Add filter to suppress specific messages
for handler in logging.root.handlers:
    handler.addFilter(SuppressSpecificMessages())

# Disable verbose logging from Google GenAI library and other dependencies
logging.getLogger('google').setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)
logging.getLogger('httpx').setLevel(logging.WARNING)
logging.getLogger('google.genai').setLevel(logging.WARNING)
logging.getLogger('google.auth').setLevel(logging.WARNING)

# Configuration
LANGUAGES = [
    "Spanish",
    "English",
    "Korean"
]

TOPICS = [
    "Daily Life",
    "Travel",
    "Food",
    "School",
    "Work",
    "Health",
    "Technology",
    "Culture",
    "Opinion",
    "Hobby",
    "Emotion",
    "Social Media",
    "Music",
    "Entertainment"
]

POLITENESS = [
    "casual",
    "formal"
]

CORRECTION_STYLES = [
    "always correct me",
    "correct with explanation",
    "correct only major errors",
    "repeat the correct answer without pointing out",
    "never correct me"
]

CORRECTION_STYLES_WEIGHT = [0.1, 0.1, 0.2, 0.2, 0.4]

CONVERSATION_LENGTHS = [
    "5-6",
    "7-8",
    "9-10",
    "11-12"
]

CONVERSATION_LENGTHS_WEIGHT = [0.2, 0.2, 0.4, 0.2]

CONVERSATION_POSITIONS = [
    "start of the conversation",
    "in the middle, no greetings or introduction",
    "towards the end"
]

CONVERSATION_POSITIONS_WEIGHT = [0.15, 0.7, 0.15]

LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
LEVELS_WEIGHT = [0.3, 0.25, 0.2, 0.15, 0.05, 0.05]

MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro", "gemini-2.0-flash-001", "gemini-2.0-flash-lite-001"]

TRAIN_SYS_PROMPT = """
You are a dataset generator for training an AI language conversational partner.

Your task is to generate a short conversation between:
- A language learner
- A conversational partner

 Behavior Rules
- Use ONLY the target language.
- Each message should be reasonably short and conversational.
- Conversations should feel like a normal chat, not a lesson.
- Conversational partner should respond naturally.
- Learner may make realistic mistakes that are typical for this language and CEFR level.

Output Format:
- Output valid JSON only.
- Follow the exact schema provided.
"""

EVAL_SYS_PROMPT = """
You are a dataset generator for evaluating a conversational AI language model.

Your task is to generate a short conversation between:
- A language learner
- A conversational partner

Behavior Rules:
- Use ONLY the target language.
- Each message should be reasonably short and conversational.
- Conversations should feel like a normal chat, not a lesson.
- Conversational partner should respond naturally.
- Learner may make realistic mistakes that are typical for this language and CEFR level.

Output Format:
- Output valid JSON only.
- Follow the exact schema provided.
"""

# Number of samples to generate per language (total)
NUM_SAMPLES_TRAIN = 2000
NUM_SAMPLES_EVAL = 50

# Initialize Google GenAI client
def init_client():
    """Initialize the Google GenAI client."""
    try:
        client = genai.Client(
            vertexai=True,
            project="chatbot-dataset-483810",
            location="global"
        )
        logger.info("Successfully initialized Google GenAI client")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize GenAI client: {e}")
        raise

def validate_schema(data):
    """Validate that the generated data matches the expected schema.

    Args:
        data: The generated data to validate

    Returns:
        tuple: (is_valid, error_message) where is_valid is True if valid,
               and error_message is None if valid or contains the error description
    """
    # Check if data is a dictionary
    if not isinstance(data, dict):
        return False, "Data is not a dictionary"

    # Check for required top-level keys
    required_keys = {"messages", "metadata"}
    if not required_keys.issubset(data.keys()):
        missing = required_keys - set(data.keys())
        return False, f"Missing top-level keys: {missing}"

    # Validate messages array
    messages = data.get("messages")
    if not isinstance(messages, list):
        return False, "messages is not a list"

    if len(messages) < 2:
        return False, f"messages array has fewer than 2 entries (got {len(messages)})"

    for idx, message in enumerate(messages):
        if not isinstance(message, dict):
            return False, f"Message at index {idx} is not a dictionary"

        # Check for required message keys
        if "role" not in message or "content" not in message:
            return False, f"Message at index {idx} missing 'role' or 'content'"

        # Validate role values
        if message["role"] not in ["user", "assistant"]:
            return False, f"Message at index {idx} has invalid role: {message['role']}"

        # Validate content is a non-empty string
        if not isinstance(message["content"], str) or not message["content"].strip():
            return False, f"Message at index {idx} has invalid or empty content"

    # Validate metadata
    metadata = data.get("metadata")
    if not isinstance(metadata, dict):
        return False, "metadata is not a dictionary"

    # Check for required metadata keys
    required_metadata_keys = {"level", "length", "position"}
    if not required_metadata_keys.issubset(metadata.keys()):
        missing = required_metadata_keys - set(metadata.keys())
        return False, f"Missing metadata keys: {missing}"

    # Validate that metadata values are non-empty strings
    for key in required_metadata_keys:
        if not isinstance(metadata[key], str) or not metadata[key].strip():
            return False, f"metadata.{key} is invalid or empty"

    return True, None


def generate_sample_eval(client, language, level, conversation_length, conversation_position, model):
    """Generate a single conversation sample."""
    usr_prompt = f"""
    Target language: {language}
    CEFR level: {level}
    Conversation length: {conversation_length}
    Conversation position: {conversation_position}

    Output schema:
    {{
      "messages": [
        {{"role": "user", "content": "..."}},
        {{"role": "assistant", "content": "..."}}
      ],
      "metadata": {{
        "level": "{level}",
        "model": "{model}",
        "length": "{conversation_length}",
        "position": "{conversation_position}"
      }}
    }}
    """

    response = client.models.generate_content(
        model=model,
        config=types.GenerateContentConfig(
            system_instruction=EVAL_SYS_PROMPT,
            response_mime_type="application/json",
            temperature=0.9
        ),
        contents=usr_prompt
    )

    return json.loads(response.text)

def generate_sample(client, language, level, topic, conversation_length, conversation_position):
    """Generate a single conversation sample."""
    usr_prompt = f"""
    Target language: {language}
    CEFR level: {level}
    Topic: {topic}
    Conversation length: {conversation_length}
    Conversation position: {conversation_position}

    Output schema:
    {{
      "messages": [
        {{"role": "user", "content": "..."}},
        {{"role": "assistant", "content": "..."}}
      ],
      "metadata": {{
        "level": "{level}",
        "topic": "{topic}",
        "length": "{conversation_length}",
        "position": "{conversation_position}"
      }}
    }}
    """

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        config=types.GenerateContentConfig(
            system_instruction=TRAIN_SYS_PROMPT,
            response_mime_type="application/json",
            temperature=0.9
        ),
        contents=usr_prompt
    )

    return json.loads(response.text)

def generate_batch(choice, client, language, num_samples):
    """Generate a batch of samples for a given language.

    This function guarantees exactly num_samples will be generated by retrying
    failed attempts until the target count is reached.
    """
    
    if choice == "t":
        output_path = f"{language}_training_data.jsonl"

    else:
        output_path = f"{language}_evaluation_data.jsonl"

    successful = 0
    failed = 0
    validation_failed = 0

    logger.info(f"Starting batch generation: {num_samples} samples for {language}")

    while successful < num_samples:
        try:
            # Randomly select parameters
            level = random.choices(LEVELS, weights=LEVELS_WEIGHT)[0]
            topic = random.choice(TOPICS)
            model = random.choice(MODELS)
            correction_style = random.choices(CORRECTION_STYLES, weights=CORRECTION_STYLES_WEIGHT)[0]
            conversation_length = random.choices(CONVERSATION_LENGTHS, weights=CONVERSATION_LENGTHS_WEIGHT)[0]
            conversation_position = random.choices(CONVERSATION_POSITIONS, weights=CONVERSATION_POSITIONS_WEIGHT)[0]

            # Generate sample

            if choice == "t":
                data_dict = generate_sample(
                    client, language, level, topic,
                    conversation_length, conversation_position
                )

            else:
                data_dict = generate_sample_eval(
                    client, language, level, conversation_length,
                    conversation_position, model
                )

            # Validate schema
            is_valid, error_msg = validate_schema(data_dict)
            if not is_valid:
                validation_failed += 1
                logger.warning(f"Schema validation failed for {language} (attempt {successful + failed + validation_failed}): {error_msg}")
                continue

            # Write to file
            with open(output_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(data_dict, ensure_ascii=False) + "\n")

            successful += 1

            # Progress logging
            if successful % 10 == 0:
                logger.info(f"Progress: {successful}/{num_samples} samples generated for {language}")

        except Exception as e:
            failed += 1
            logger.error(f"Error generating sample for {language} (attempt {successful + failed + validation_failed}): {e}")
            # Continue with next attempt instead of stopping
            continue

    logger.info(f"Batch complete for {language}: {successful} successful, {failed} API failures, {validation_failed} validation failures")
    return successful, failed


def run_generation(choice):
    """Generate dataset with specified number of samples per language."""
    
    if choice == "t":
        logger.info("Starting training dataset generation")

    else:
        logger.info("Starting evaluation dataset generation")

    try:
        client = init_client()
    except Exception as e:
        logger.error("Cannot start without GenAI client. Exiting.")
        return

    start_time = time.time()
    total_successful = 0
    total_failed = 0

    # Generate samples for each language
    for language in LANGUAGES:
        try:

            if choice == "t":
                successful, failed = generate_batch(choice, client, language, NUM_SAMPLES_TRAIN)

            else: 
                successful, failed = generate_batch(choice, client, language, NUM_SAMPLES_EVAL)

            total_successful += successful
            total_failed += failed
        except Exception as e:
            logger.error(f"Failed to generate batch for {language}: {e}")
            continue

    elapsed_time = time.time() - start_time
    logger.info(f"=== Generation complete ===")
    logger.info(f"Total successful: {total_successful}, Total failed: {total_failed}")
    logger.info(f"Time taken: {elapsed_time:.2f} seconds")


if __name__ == "__main__":
    try:
        # Check if argument provided, otherwise ask for input
        if len(sys.argv) > 1:
            choice = sys.argv[1]
        else:
            choice = input("Press e for evaluation and t for training: ")

        run_generation(choice)
    except KeyboardInterrupt:
        logger.info("Received interrupt signal. Shutting down gracefully...")
    except Exception as e:
        logger.error(f"Unexpected error in main: {e}")
        raise
