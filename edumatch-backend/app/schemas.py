from pydantic import BaseModel, Field
from typing import List, Optional


# ============================================================
# 1. STUDENT PROFILE
# ============================================================

class StudentProfileCreate(BaseModel):
    name: str
    topic: str
    goal: str
    preferred_format: str


class StudentProfileResponse(BaseModel):
    id: int
    name: str
    topic: str
    goal: str
    preferred_format: str

    class Config:
        from_attributes = True


# ============================================================
# 2. DIAGNOSTIC QUIZ - AI GENERATED QUESTION
# ============================================================

class Question(BaseModel):
    question: str

    # Exactly 4 options
    options: List[str] = Field(..., min_length=4, max_length=4)

    # 0, 1, 2 or 3
    correct_answer: int = Field(..., ge=0, le=3)

    subtopic: str
    difficulty: str
    explanation: str


class DiagnosticTest(BaseModel):
    # Exactly 10 questions
    questions: List[Question] = Field(
        ...,
        min_length=10,
        max_length=10
    )


# ============================================================
# 3. QUIZ ANSWER
# ============================================================

class QuizAnswer(BaseModel):
    question_id: int

    # 0 = option A
    # 1 = option B
    # 2 = option C
    # 3 = option D
    selected_answer: int = Field(
        ...,
        ge=0,
        le=3
    )


# ============================================================
# 4. QUIZ SUBMISSION
# ============================================================

class QuizSubmission(BaseModel):
    profile_id: int

    answers: List[QuizAnswer]


# ============================================================
# 5. QUIZ RESULT
# ============================================================

class QuizResult(BaseModel):
    profile_id: int

    score: int
    total_questions: int
    correct_answers: int
    wrong_answers: int

    percentage: float

    level: str


