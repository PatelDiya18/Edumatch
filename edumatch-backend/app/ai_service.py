import json
import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq

logger = logging.getLogger(__name__)
GROQ_MODEL = "openai/gpt-oss-120b"

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _build_fallback_question_set(topic: str, goal: str) -> dict:
    topic_name = (topic or "general learning").strip() or "general learning"
    goal_name = (goal or "build understanding").strip() or "build understanding"
    lower_topic = topic_name.lower()

    if "data structure" in lower_topic or "algorithm" in lower_topic:
        subtopics = [
            "Arrays and lists",
            "Stacks and queues",
            "Trees and traversals",
            "Graphs and shortest paths",
            "Hashing and maps",
            "Recursion and time complexity",
            "Sorting and searching",
            "Linked lists",
            "Dynamic programming",
            "Problem-solving strategy",
        ]
    elif "machine learning" in lower_topic or "ai" in lower_topic:
        subtopics = [
            "Model basics",
            "Training and validation",
            "Bias and variance",
            "Feature engineering",
            "Classification",
            "Regression",
            "Clustering",
            "Evaluation metrics",
            "Neural networks",
            "Deployment and monitoring",
        ]
    elif "chem" in lower_topic or "organic" in lower_topic:
        subtopics = [
            "Atomic structure",
            "Bonding fundamentals",
            "Functional groups",
            "Resonance and stability",
            "Reaction mechanisms",
            "Acids and bases",
            "Stereochemistry",
            "Spectroscopy basics",
            "Nomenclature",
            "Organic synthesis",
        ]
    elif "econom" in lower_topic or "micro" in lower_topic:
        subtopics = [
            "Supply and demand",
            "Consumer choice",
            "Elasticity",
            "Production costs",
            "Market structures",
            "Taxes and subsidies",
            "Trade-offs and incentives",
            "Opportunity cost",
            "Welfare and efficiency",
            "Policy analysis",
        ]
    else:
        subtopics = [
            "Foundations",
            "Core principles",
            "Problem solving",
            "Concept application",
            "Reasoning",
            "Comparison",
            "Examples and analogies",
            "Common mistakes",
            "Transfer to new situations",
            "Goal-based practice",
        ]

    template_questions = [
        "Which answer best demonstrates understanding of the core idea?",
        "A learner wants to apply this concept to a real case. What is the most accurate next step?",
        "Which statement is most correct based on the underlying principle?",
        "What is the clearest explanation of why this approach works?",
        "Which option shows the strongest reasoning for this scenario?",
        "What would be the best interpretation of the evidence?",
        "Which response identifies the main cause or mechanism?",
        "A correct solution should prioritize which idea most?",
        "Which statement best connects the concept to the learning goal?",
        "What is the strongest conclusion someone can draw here?",
    ]

    questions = []
    for index, subtopic in enumerate(subtopics):
        correct_option = (
            f"The best explanation for {subtopic.lower()} is to connect the concept "
            "to the main principle and test it in context."
        )
        distractors = [
            f"{subtopic} is best understood by skipping the goal and focusing only on memorized examples.",
            f"This topic only matters when it is used in a strict textbook formula without adaptation.",
            f"The learner should ignore evidence and choose the answer that sounds most advanced.",
        ]
        correct_answer = index % 4
        options = distractors[:correct_answer] + [correct_option] + distractors[correct_answer:]
        questions.append({
            "subtopic": subtopic,
            "question": f"{template_questions[index % len(template_questions)]} ({goal_name})",
            "options": options,
            "correct_answer": correct_answer,
            "difficulty": ["beginner", "beginner", "intermediate", "intermediate", "intermediate", "advanced", "beginner", "intermediate", "advanced", "advanced"][index],
            "explanation": f"The correct choice reflects the underlying concept of {subtopic.lower()} and aligns with the learner goal: {goal_name}. It emphasizes understanding and applying the principle rather than memorization.",
        })

    return {"questions": questions}


def generate_diagnostic_questions(
    topic: str,
    goal: str
):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY is missing. Using built-in fallback diagnostic questions.")
        return _build_fallback_question_set(topic, goal)

    client = Groq(api_key=api_key, timeout=60.0, max_retries=0)

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

                max_completion_tokens=6000,

                response_format={
                    "type": "json_object"
                }
            )

            if not response.choices:
                raise RuntimeError("Groq returned zero choices.")

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
                raise RuntimeError("Groq returned empty response content.")

            try:
                data = json.loads(content)
            except json.JSONDecodeError as exc:
                logger.error("Groq returned invalid JSON: %s", content)
                raise RuntimeError("Groq returned invalid JSON.") from exc

            questions = data.get("questions")

            if not isinstance(questions, list):
                raise RuntimeError("Groq response does not contain a valid questions list.")

            if len(questions) != 10:
                raise RuntimeError(f"Expected 10 questions but Groq returned {len(questions)}.")

            validated_questions = []
            for index, question in enumerate(questions, start=1):
                if not isinstance(question, dict):
                    raise RuntimeError(f"Question {index} is invalid.")

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
                        raise RuntimeError(f"Question {index} is missing '{field}'.")

                options = question["options"]
                if not isinstance(options, list):
                    raise RuntimeError(f"Question {index} options must be a list.")

                if len(options) != 4:
                    raise RuntimeError(f"Question {index} must have exactly 4 options.")

                correct_answer = question["correct_answer"]
                if type(correct_answer) is not int or correct_answer not in [0, 1, 2, 3]:
                    raise RuntimeError(f"Question {index} has invalid correct_answer.")

                if not isinstance(question["difficulty"], str):
                    raise RuntimeError(f"Question {index} has invalid difficulty.")

                difficulty = question["difficulty"].strip().lower()
                if difficulty not in ["beginner", "intermediate", "advanced"]:
                    raise RuntimeError(f"Question {index} has invalid difficulty.")

                if not isinstance(question["subtopic"], str) or not question["subtopic"].strip():
                    raise RuntimeError(f"Question {index} has an invalid subtopic.")

                if not isinstance(question["question"], str) or not question["question"].strip():
                    raise RuntimeError(f"Question {index} has an invalid question.")

                if not isinstance(question["explanation"], str) or not question["explanation"].strip():
                    raise RuntimeError(f"Question {index} has an invalid explanation.")

                for option in options:
                    if not isinstance(option, str) or not option.strip():
                        raise RuntimeError(f"Question {index} contains an invalid option.")

                validated_questions.append({
                    "subtopic": question["subtopic"].strip(),
                    "question": question["question"].strip(),
                    "options": [option.strip() for option in options],
                    "correct_answer": correct_answer,
                    "difficulty": difficulty,
                    "explanation": question["explanation"].strip(),
                })

            logger.info("Successfully generated 10 diagnostic questions.")
            return {"questions": validated_questions}

        except Exception as exc:
            last_error = exc
            logger.exception("Diagnostic quiz generation attempt %s failed.", attempt)
            if attempt < 3:
                wait_time = 2 ** attempt
                logger.info("Retrying in %s seconds...", wait_time)
                time.sleep(wait_time)

    logger.warning("Falling back to built-in diagnostic questions after Groq failure. Last error: %s", last_error)
    return _build_fallback_question_set(topic, goal)