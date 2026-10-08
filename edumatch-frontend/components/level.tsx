import { useState } from "react";
import { submitQuiz } from "@/lib/api";

export function Level() {
    const [quizResult, setQuizResult] = useState<any>(null);

    return quizResult ? (
        <div>
            <h2>Diagnostic Result</h2>

            <p>
                Score: {quizResult.score}/
                {quizResult.total_questions}
            </p>

            <p>
                Percentage: {quizResult.percentage}%
            </p>

            <p>
                Correct: {quizResult.correct_answers}
            </p>

            <p>
                Wrong: {quizResult.wrong_answers}
            </p>

            <h3>
                Level: {quizResult.level}
            </h3>
        </div>
    ) : null;
}