import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

print("API key found:", bool(api_key))
print("API key length:", len(api_key) if api_key else 0)

client = Groq(
    api_key=api_key,
    timeout=60.0,
    max_retries=0,
)

try:
    print("\nCalling Groq...")

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": "Reply with exactly: GROQ_OK"
            }
        ],
        temperature=0,
        max_completion_tokens=20,
    )

    print("\nSUCCESS")
    print("Finish reason:", response.choices[0].finish_reason)
    print("Content:", repr(response.choices[0].message.content))

except Exception as e:
    print("\nFAILED")
    print("Exception type:", type(e).__name__)
    print("Exception:", repr(e))