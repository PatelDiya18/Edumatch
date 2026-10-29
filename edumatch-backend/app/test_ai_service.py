import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from .ai_service import _build_fallback_question_set, generate_diagnostic_questions


class DiagnosticQuestionGenerationTests(unittest.TestCase):
    def test_fallback_has_ten_questions_with_correct_option_indexes(self):
        result = _build_fallback_question_set("Algebra", "learn equations")
        questions = result["questions"]

        self.assertEqual(len(questions), 10)
        for index, question in enumerate(questions):
            self.assertEqual(len(question["options"]), 4)
            self.assertEqual(question["correct_answer"], index % 4)
            self.assertIn(
                "connect the concept",
                question["options"][question["correct_answer"]],
            )

    @patch.dict("os.environ", {"GROQ_API_KEY": "test-key"})
    @patch("app.ai_service.Groq")
    def test_groq_request_uses_completion_token_parameter(self, groq_class):
        fallback = _build_fallback_question_set("Algebra", "learn equations")
        groq_class.return_value.chat.completions.create.return_value = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=json.dumps(fallback)),
                    finish_reason="stop",
                )
            ]
        )

        result = generate_diagnostic_questions("Algebra", "learn equations")

        self.assertEqual(len(result["questions"]), 10)
        request = groq_class.return_value.chat.completions.create.call_args.kwargs
        self.assertEqual(request["max_completion_tokens"], 6000)
        self.assertNotIn("max_tokens", request)


if __name__ == "__main__":
    unittest.main()
