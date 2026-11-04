
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




def generate_diagnostic_questions(topic: str, goal: str):
    try:
        groq_module = importlib.import_module("groq")
    except ModuleNotFoundError as exc:
        if exc.name != "groq":
            raise
        raise RuntimeError(
            "Install Groq using: pip install groq"
        ) from exc

    client = groq_module.Groq(api_key=GROQ_API_KEY)

    topic = topic.strip()
    goal = goal.strip()

    prompt = f"""
You are an expert educational assessment designer.

Generate a personalized diagnostic assessment.

STUDENT INFORMATION:
Topic: {topic}
Learning goal: {goal}

TASK:
Generate exactly 10 original multiple-choice questions.

DIFFICULTY DISTRIBUTION:
- 3 beginner questions
- 4 intermediate questions
- 3 advanced questions

QUESTION REQUIREMENTS:
1. Every question must directly relate to the student's topic.
2. Cover different subtopics.
3. Avoid repeated concepts and repeated questions.
4. Test conceptual understanding and practical application.
5. Include exactly four distinct options.
6. Only one option must be correct.
7. correct_answer must be an integer from 0 to 3.
8. Difficulty must be beginner, intermediate, or advanced.
9. Include a meaningful explanation.
10. Make questions appropriate to the student's learning goal.

Return ONLY valid JSON in this structure:

{{
  "questions": [
    {{
      "subtopic": "string",
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "difficulty": "beginner",
      "explanation": "string"
    }}
  ]
}}

Do not include Markdown or code fences.
"""

    last_error = None

    for attempt in range(1, 4):
        try:
            logger.info(
                "Generating Groq quiz for topic=%s, attempt=%s",
                topic,
                attempt
            )

            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an educational assessment expert. "
                            "Return only valid JSON."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.6,
                max_tokens=6000,
                response_format={"type": "json_object"}
            )

            if not response.choices:
                raise RuntimeError("Groq returned no choices.")

            choice = response.choices[0]

            logger.info(
                "Groq finish reason: %s",
                choice.finish_reason
            )

            if choice.finish_reason == "length":
                raise RuntimeError(
                    "Groq response was incomplete due to token limit."
                )

            content = choice.message.content

            if not content:
                raise RuntimeError("Groq returned empty content.")

            data = json.loads(content)

            questions = data.get("questions")

            if not isinstance(questions, list) or len(questions) != 10:
                raise RuntimeError(
                    "Groq must return exactly 10 questions."
                )

            for index, question in enumerate(questions, start=1):

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
                            f"Question {index} missing {field}."
                        )

                    if question[field] is None:
                        raise RuntimeError(
                            f"Question {index} has empty {field}."
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
                        f"Question {index} must have four valid options."
                    )

                if len(set(options)) != 4:
                    raise RuntimeError(
                        f"Question {index} has duplicate options."
                    )

                correct_answer = question["correct_answer"]

                if (
                    type(correct_answer) is not int
                    or correct_answer not in [0, 1, 2, 3]
                ):
                    raise RuntimeError(
                        f"Question {index} has invalid correct_answer."
                    )

                difficulty = str(question["difficulty"]).lower()

                if difficulty not in [
                    "beginner",
                    "intermediate",
                    "advanced"
                ]:
                    raise RuntimeError(
                        f"Question {index} has invalid difficulty."
                    )

                question["difficulty"] = difficulty

                for field in ["subtopic", "question", "explanation"]:
                    if not isinstance(question[field], str) or not question[field].strip():
                        raise RuntimeError(
                            f"Question {index} has invalid {field}."
                        )

            logger.info(
                "Successfully generated 10 Groq diagnostic questions."
            )

            return data

        except Exception as exc:
            last_error = exc

            logger.exception(
                "Groq quiz generation attempt %s failed.",
                attempt
            )

            if attempt < 3:
                wait_time = 2 ** attempt
                time.sleep(wait_time)

    raise RuntimeError(
        f"Unable to generate diagnostic quiz after 3 attempts. "
        f"Last error: {last_error}"
    )
    