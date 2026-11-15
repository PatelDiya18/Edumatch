from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash = Column(String(255), nullable=False)

    phone_number = Column(String(20), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    profiles = relationship("StudentProfile", back_populates="user")


class LearningProgress(Base):
    __tablename__ = "learning_progress"

    id = Column(Integer, primary_key=True, index=True)

    profile_id = Column(
        Integer,
        ForeignKey("student_profiles.id"),
        nullable=False,
        index=True
    )

    assessment_type = Column(String(50), nullable=False)

    score = Column(Float, nullable=False)

    level = Column(String(30), nullable=False)

    attempted_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )


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
    user_id = Column(
    Integer,
    ForeignKey("users.id"),
    nullable=True,
    index=True
)

    user = relationship("User", back_populates="profiles")


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
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    score: Any = Column(Integer, nullable=False)
    total_questions: Any = Column(Integer, nullable=False)
    percentage: Any = Column(Float, nullable=False)
    level: Any = Column(String, nullable=False)
    answer_review: Any = Column(Text, nullable=True)

    created_at: Any = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )