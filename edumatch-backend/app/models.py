from datetime import datetime
from typing import Any

from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.sql import func

from .database import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id: Any = Column(Integer, primary_key=True, index=True)
    name: Any = Column(String, nullable=False)
    topic: Any = Column(String, nullable=False)
    preferred_format: Any = Column(String, nullable=False)
    goal: Any = Column(String, nullable=False)

    created_at: Any = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


class Resource(Base):
    __tablename__ = "resources"

    id: Any = Column(Integer, primary_key=True, index=True)
    title: Any = Column(String, nullable=False)
    description: Any = Column(String, nullable=False)
    topic: Any = Column(String, nullable=False)
    resource_type: Any = Column(String, nullable=False)
    difficulty: Any = Column(String, nullable=False)
    url: Any = Column(String, nullable=False)
    estimated_minutes: Any = Column(Integer, nullable=True)


class DiagnosticQuestion(Base):
    __tablename__ = "diagnostic_questions"

    id: Any = Column(Integer, primary_key=True, index=True)
    profile_id: Any = Column(Integer, nullable=True, index=True)
    topic: Any = Column(String, nullable=False)
    subtopic: Any = Column(String, nullable=False)
    question: Any = Column(String, nullable=False)

    option_a: Any = Column(String, nullable=False)
    option_b: Any = Column(String, nullable=False)
    option_c: Any = Column(String, nullable=False)
    option_d: Any = Column(String, nullable=False)

    correct_answer: Any = Column(Integer, nullable=False)
    difficulty: Any = Column(String, nullable=False)
    explanation: Any = Column(String, nullable=True)


class DiagnosticResult(Base):
    __tablename__ = "diagnostic_results"

    id: Any = Column(Integer, primary_key=True, index=True)
    profile_id: Any = Column(Integer, nullable=False, index=True)
    score: Any = Column(Integer, nullable=False)
    total_questions: Any = Column(Integer, nullable=False)
    percentage: Any = Column(Float, nullable=False)
    level: Any = Column(String, nullable=False)

    created_at: Any = Column(DateTime, default=datetime.utcnow)