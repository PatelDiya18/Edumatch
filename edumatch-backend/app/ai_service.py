import json
import logging
import time
from groq import Groq

logger = logging.getLogger(__name__)
GROQ_MODEL = "openai/gpt-oss-120b"


def generate_diagnostic_questions(
    topic: str,
    goal: str
):
    client = Groq()

    prompt = f"""
You are an expert educational assessment generator.

Create a diagnostic test for a student.

Topic:
{topic}

Learning goal:
{goal}

Requirements:

1. Generate exactly 10 questions.
2. Every question must have exactly 4 options.
3. The options must be meaningful and different.
4. correct_answer must be an integer:
   0, 1, 2, or 3.
5. difficulty must be one of:
   beginner, intermediate, advanced.
6. Include the subtopic tested.
7. Include a short explanation of the correct answer.
8. Questions should assess actual understanding, not memorization only.
9. Return ONLY valid JSON.
10. Do not use markdown.
11. Do not include ```json or ```.

Return exactly this structure:

{{
    "questions": [
        {{
            "subtopic": "string",
            "question": "string",
            "options": [
                "option 1",
                "option 2",
                "option 3",
                "option 4"
            ],
            "correct_answer": 0,
            "difficulty": "beginner",
            "explanation": "string"
        }}
    ]
}}
"""

    last_error = None

    for attempt in range(1, 4):

        try:

            logger.info(
                "Generating diagnostic quiz. Attempt %s/3",
                attempt
            )

            response = client.chat.completions.create(
                model=GROQ_MODEL,

                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a diagnostic quiz generator. "
                            "Always return valid JSON only."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],

                temperature=0.2,

                max_tokens=6000,

                response_format={
                    "type": "json_object"
                }
            )

            # ----------------------------------
            # Check response
            # ----------------------------------

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