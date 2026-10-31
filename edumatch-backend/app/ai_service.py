
import json
import importlib
import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Find the backend folder
BASE_DIR = Path(__file__).resolve().parent.parent

# Locate the .env file inside the backend folder
ENV_FILE = BASE_DIR / ".env"

# Load environment variables
load_dotenv(ENV_FILE, override=True)

# Read Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        f"GROQ_API_KEY is missing. Check {ENV_FILE}"
    )

GROQ_MODEL = "openai/gpt-oss-120b"



def generate_diagnostic_questions(
    topic: str,
    goal: str
):
    try:
        groq_module = importlib.import_module("groq")
    except ModuleNotFoundError as exc:
        if exc.name != "groq":
            raise
        raise RuntimeError(
            "The Groq package is required. Install it with 'pip install groq'."
        ) from exc

    client = groq_module.Groq()

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

                max_tokens=6000,

                response_format={
                    "type": "json_object"
                }
            )

            if not response.choices:

                raise RuntimeError(
                    "Groq returned zero choices."
                )


            message = response.choices[0].message

            content = message.content


            logger.info(
                "Groq finish reason: %s",
                response.choices[0].finish_reason
            )


            logger.info(
                "Groq response content length: %s",
                len(content) if content else 0
            )


            if not content:

                raise RuntimeError(
                    "Groq returned empty response content."
                )


            # ----------------------------------
            # Parse JSON
            # ----------------------------------

            try:

                data = json.loads(content)
            except json.JSONDecodeError as exc:

                logger.error(
                    "Groq returned invalid JSON: %s",
                    content
                )

                raise RuntimeError(
                    "Groq returned invalid JSON."
                ) from exc


            # ----------------------------------
            # Validate questions
            # ----------------------------------

            questions = data.get("questions")

            if not isinstance(questions, list):

                raise RuntimeError(
                    "Groq response does not contain "
                    "a valid questions list."
                )


            if len(questions) != 10:

                raise RuntimeError(
                    f"Expected 10 questions but Groq "
                    f"returned {len(questions)}."
                )


            for index, question in enumerate(
                questions,
                start=1
            ):

                if not isinstance(question, dict):

                    raise RuntimeError(
                        f"Question {index} is invalid."
                    )


                required_fields = [
                    "subtopic",
                    "question",
                    "options",
                    "correct_answer",
                    "difficulty",
                    "explanation"
                ]


                for field in required_fields:

                    if field not in question:

                        raise RuntimeError(
                            f"Question {index} is missing "
                            f"'{field}'."
                        )


                options = question["options"]


                if not isinstance(options, list):

                    raise RuntimeError(
                        f"Question {index} options "
                        f"must be a list."
                    )


                if len(options) != 4:

                    raise RuntimeError(
                        f"Question {index} must have "
                        f"exactly 4 options."
                    )


                correct_answer = (
                    question["correct_answer"]
                )


                if correct_answer not in [0, 1, 2, 3]:

                    raise RuntimeError(
                        f"Question {index} has invalid "
                        f"correct_answer."
                    )


                difficulty = (
                    str(question["difficulty"])
                    .lower()
                )


                if difficulty not in [
                    "beginner",
                    "intermediate",
                    "advanced"
                ]:

                    raise RuntimeError(
                        f"Question {index} has invalid "
                        f"difficulty."
                    )


            logger.info(
                "Successfully generated 10 diagnostic questions."
            )


            return data


        except Exception as exc:

            last_error = exc

            logger.exception(
                "Diagnostic quiz generation attempt %s failed.",
                attempt
            )


            if attempt < 3:

                wait_time = 2 ** attempt

                logger.info(
                    "Retrying in %s seconds...",
                    wait_time
                )

                time.sleep(wait_time)


    raise RuntimeError(
        "Unable to generate diagnostic quiz after "
        f"3 attempts. Last error: {last_error}"
    )