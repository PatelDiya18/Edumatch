
import json
import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from groq import (
    Groq,
    APIConnectionError,
    APITimeoutError,
    RateLimitError,
    InternalServerError,
)

# --------------------------------------------------
# Environment and configuration
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE, override=False)

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        f"GROQ_API_KEY is missing. Check {ENV_FILE}"
    )

GROQ_MODEL = "openai/gpt-oss-120b"

client = Groq(
    api_key=GROQ_API_KEY,
    timeout=60.0,
    max_retries=0,
)

# --------------------------------------------------
# Quiz generation
# --------------------------------------------------

def generate_diagnostic_questions(topic: str, goal: str) -> dict:
    if not topic or not topic.strip():
        raise ValueError("Topic cannot be empty.")

    if not goal or not goal.strip():
        raise ValueError("Learning goal cannot be empty.")

    prompt = f"""
Create a diagnostic quiz to assess a student's understanding.

Topic: {topic.strip()}
Learning goal: {goal.strip()}

Generate exactly 10 multiple-choice questions.

Requirements for every question:
- Include a meaningful subtopic.
- Include a clear question.
- Provide exactly 4 distinct options.
- correct_answer must be an integer from 0 to 3.
- The integer identifies the correct option by zero-based index.
- difficulty must be beginner, intermediate, or advanced.
- Include a concise explanation of the correct answer.
- Assess understanding, not just memorization.

Return only a JSON object with this structure:
{{
  "questions": [
    {{
      "subtopic": "string",
      "question": "string",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": 0,
      "difficulty": "beginner",
      "explanation": "string"
    }}
  ]
}}

The questions array must contain exactly 10 questions.
Do not use Markdown or code fences.
"""

    last_error = None

    # Retry only temporary connection, timeout, server, or rate-limit errors.
    for attempt in range(1, 4):
        try:
            logger.info(
                "Generating quiz for topic=%r, attempt=%s/3",
                topic,
                attempt,
            )

            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You generate educational assessments. "
                            "Return a complete JSON object only."
                        ),
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0.2,
                max_completion_tokens=6000,
                response_format={"type": "json_object"},
                reasoning_effort="low",
            )

            if not response.choices:
                raise RuntimeError("Groq returned no choices.")

            choice = response.choices[0]
            content = choice.message.content

            logger.info(
                "Groq finish_reason=%s",
                choice.finish_reason,
            )

            if not content or not content.strip():
                raise RuntimeError(
                    "Groq returned empty content. "
                    f"finish_reason={choice.finish_reason!r}. "
                    "Check the model response and token limit."
                )

            if choice.finish_reason == "length":
                raise RuntimeError(
                    "Groq stopped before completing the quiz "
                    "because the output token limit was reached. "
                    "Reduce question/explanation length or increase "
                    "max_completion_tokens within the model limit."
                )

            try:
                data = json.loads(content)
            except json.JSONDecodeError as exc:
                logger.error(
                    "Invalid JSON returned by Groq: %s",
                    content[:500],
                )
                raise RuntimeError(
                    "Groq returned invalid JSON."
                ) from exc

            questions = data.get("questions")

            if not isinstance(questions, list):
                raise RuntimeError(
                    "Groq response is missing the questions list."
                )

            if len(questions) != 10:
                raise RuntimeError(
                    f"Expected 10 questions; received {len(questions)}."
                )

            required_fields = {
                "subtopic",
                "question",
                "options",
                "correct_answer",
                "difficulty",
                "explanation",
            }

            allowed_difficulties = {
                "beginner",
                "intermediate",
                "advanced",
            }

            for index, question in enumerate(questions, start=1):
                if not isinstance(question, dict):
                    raise RuntimeError(
                        f"Question {index} is not an object."
                    )

                missing = required_fields - question.keys()
                if missing:
                    raise RuntimeError(
                        f"Question {index} is missing fields: "
                        f"{sorted(missing)}"
                    )

                for field in (
                    "subtopic",
                    "question",
                    "explanation",
                ):
                    if (
                        not isinstance(question[field], str)
                        or not question[field].strip()
                    ):
                        raise RuntimeError(
                            f"Question {index}: {field} must be "
                            "a non-empty string."
                        )

                options = question["options"]

                if (
                    not isinstance(options, list)
                    or len(options) != 4
                    or not all(
                        isinstance(option, str) and option.strip()
                        for option in options
                    )
                ):
                    raise RuntimeError(
                        f"Question {index} must have "
                        "exactly four non-empty string options."
                    )

                answer = question["correct_answer"]

                # bool is a subclass of int, so reject it explicitly.
                if type(answer) is not int or answer not in (0, 1, 2, 3):
                    raise RuntimeError(
                        f"Question {index} has an invalid "
                        "correct_answer index."
                    )

                difficulty = question["difficulty"]

                if (
                    not isinstance(difficulty, str)
                    or difficulty.lower() not in allowed_difficulties
                ):
                    raise RuntimeError(
                        f"Question {index} has invalid difficulty."
                    )

                question["difficulty"] = difficulty.lower()

            logger.info(
                "Successfully generated and validated 10 questions."
            )

            return {"questions": questions}

        except (
            APIConnectionError,
            APITimeoutError,
            RateLimitError,
            InternalServerError,
        ) as exc:
            last_error = exc

            logger.warning(
                "Temporary Groq API failure on attempt %s/3: %s",
                attempt,
                exc,
            )

            if attempt < 3:
                time.sleep(2 ** attempt)

        except Exception:
            # Invalid JSON, wrong model settings, or validation errors
            # should not be retried blindly.
            logger.exception("Quiz generation failed.")
            raise

    raise RuntimeError(
        "Groq remained unavailable after 3 attempts. "
        f"Last error: {last_error}"
    ) from last_error