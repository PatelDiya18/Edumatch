import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .database import Base, engine, SessionLocal
from .models import StudentProfile, Resource, DiagnosticQuestion,DiagnosticResult
from .ai_service import generate_diagnostic_questions
from .models import DiagnosticQuestion, DiagnosticResult
from app.resource_service import (
    get_recommended_resources
)

logger = logging.getLogger(__name__)

app = FastAPI(title="EduMatch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


Base.metadata.create_all(bind=engine)


class ProfileCreate(BaseModel):
    name: str
    topic: str
    preferred_format: str
    goal: str


class ResourceCreate(BaseModel):
    title: str
    description: str
    topic: str
    resource_type: str
    difficulty: str
    url: str
    estimated_minutes: int | None = None


class QuizAnswer(BaseModel):
    question_id: int
    selected_answer: str


class QuizSubmission(BaseModel):
    profile_id: int
    answers: list[QuizAnswer]


@app.get("/")
def root():
    return {"message": "EduMatch backend is running"}


@app.get("/test")
def test():
    return {"message": "Backend connection successful"}


@app.post("/profile")
def create_profile(profile: ProfileCreate):
    db = SessionLocal()

    try:
        new_profile = StudentProfile(
            name=profile.name.strip(),
            topic=profile.topic.strip(),
            preferred_format=profile.preferred_format,
            goal=profile.goal.strip()
        )

        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)

        return {
            "message": "Profile created successfully",
            "profile_id": new_profile.id,
            "name": new_profile.name,
            "topic": new_profile.topic,
            "preferred_format": new_profile.preferred_format,
            "goal": new_profile.goal,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@app.post("/resources")
def create_resource(resource: ResourceCreate):
    db = SessionLocal()

    try:
        new_resource = Resource(
            title=resource.title,
            description=resource.description,
            topic=resource.topic,
            resource_type=resource.resource_type,
            difficulty=resource.difficulty,
            url=resource.url,
            estimated_minutes=resource.estimated_minutes,
        )

        db.add(new_resource)
        db.commit()
        db.refresh(new_resource)

        return {
            "message": "Resource created successfully",
            "resource_id": new_resource.id,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@app.get("/resources")
def get_resources():
    db = SessionLocal()

    resources = db.query(Resource).all()

    db.close()

    return resources
@app.get("/resources/{topic}")
def get_resources_by_topic(topic: str):

    db = SessionLocal()

    resources = db.query(Resource).filter(
        Resource.topic == topic
    ).all()

    db.close()



@app.post("/quiz/generate/{profile_id}")
def generate_quiz(profile_id: int):
    db = SessionLocal()

    try:
        # 1. Find the student profile
        profile = db.query(StudentProfile).filter(
            StudentProfile.id == profile_id
        ).first()

        if profile is None:
            raise HTTPException(
                status_code=404,
                detail="Profile not found"
            )

        # 2. Generate questions using Groq
        ai_result = generate_diagnostic_questions(
            profile.topic,
            profile.goal
        )

        questions = ai_result["questions"]

        # 3. Delete previously generated questions
        db.query(DiagnosticQuestion).filter(
            DiagnosticQuestion.profile_id == profile.id
        ).delete(synchronize_session=False)

        # 4. Store newly created questions
        created_questions = []

        for q in questions:
            new_question = DiagnosticQuestion(
                profile_id=profile.id,
                topic=profile.topic,
                subtopic=q["subtopic"],
                question=q["question"],
                option_a=q["options"][0],
                option_b=q["options"][1],
                option_c=q["options"][2],
                option_d=q["options"][3],
                correct_answer=q["correct_answer"],
                difficulty=q["difficulty"],
                explanation=q["explanation"]
            )

            db.add(new_question)
            created_questions.append(new_question)

        # 5. Save questions to database
        db.commit()

        # 6. Return generated questions
        return {
            "message": "Diagnostic test generated successfully",
            "profile_id": profile_id,
            "question_count": len(created_questions),
            "questions": [
                {
                    "question": question.question,
                    "options": [
                        question.option_a,
                        question.option_b,
                        question.option_c,
                        question.option_d
                    ],
                    "correct_answer": question.correct_answer,
                    "subtopic": question.subtopic,
                    "difficulty": question.difficulty,
                    "explanation": question.explanation
                }
                for question in created_questions
            ]
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        logger.exception(
            "Failed to generate diagnostic questions for profile %s",
            profile_id
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to generate diagnostic questions. Please try again."
        ) from exc

    finally:
        db.close()

@app.get("/quiz/{profile_id}")
def get_quiz(profile_id: int):
    db = SessionLocal()

    try:
        profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
        if profile is None:
            raise HTTPException(status_code=404, detail="Profile not found")

        questions = (
            db.query(DiagnosticQuestion)
            .filter(DiagnosticQuestion.profile_id == profile.id)
            .order_by(DiagnosticQuestion.id)
            .all()
        )

        if not questions:
            raise HTTPException(
                status_code=404,
                detail="No diagnostic questions found for this profile.",
            )

        return {
            "profile_id": profile.id,
            "topic": profile.topic,
            "question_count": len(questions),
            "questions": [
                {
                    "question": question.question,
                    "options": [
                        question.option_a,
                        question.option_b,
                        question.option_c,
                        question.option_d,
                    ],
                    "correct_answer": question.correct_answer,
                    "subtopic": question.subtopic,
                    "difficulty": question.difficulty,
                    "explanation": question.explanation,
                }
                for question in questions
            ],
        }
    finally:
        db.close()



@app.post("/quiz/submit")
def submit_quiz(submission: QuizSubmission):
    db = SessionLocal()

    try:
        # 1. Check whether the student profile exists
        profile = db.query(StudentProfile).filter(
            StudentProfile.id == submission.profile_id
        ).first()

        if profile is None:
            raise HTTPException(
                status_code=404,
                detail="Profile not found"
            )

        # 2. Fetch questions belonging to this profile
        questions = db.query(DiagnosticQuestion).filter(
            DiagnosticQuestion.profile_id == submission.profile_id
        ).all()

        if not questions:
            raise HTTPException(
                status_code=404,
                detail="No diagnostic quiz found for this profile"
            )

        # 3. Create a map of question IDs
        question_map = {
            question.id: question for question in questions
        }

        # 4. Validate submitted answers
        submitted_ids = [
            answer.question_id for answer in submission.answers
        ]

        if len(submitted_ids) != len(set(submitted_ids)):
            raise HTTPException(
                status_code=400,
                detail="Duplicate question answers are not allowed"
            )

        if set(submitted_ids) != set(question_map.keys()):
            raise HTTPException(
                status_code=400,
                detail="Please submit answers for all quiz questions"
            )

        # 5. Calculate score
        score = 0

        for answer in submission.answers:
            question = question_map[answer.question_id]

            if answer.selected_answer == question.correct_answer:
                score += 1

        total_questions = len(questions)

        percentage = (score / total_questions) * 100

        # 6. Determine learning level
        if percentage >= 80:
            level = "Advanced"
        elif percentage >= 50:
            level = "Intermediate"
        else:
            level = "Beginner"

        # 7. Save quiz result
        result = DiagnosticResult(
            profile_id=submission.profile_id,
            score=score,
            total_questions=total_questions,
            percentage=percentage,
            level=level
        )

        db.add(result)

        # 8. Update student's learning profile
        profile.learning_level = level

        db.commit()
        db.refresh(result)

        # 9. Return result
        return {
            "message": "Quiz submitted successfully",
            "profile_id": submission.profile_id,
            "score": score,
            "total_questions": total_questions,
            "percentage": round(percentage, 2),
            "level": level
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        logger.exception("Quiz submission failed")

        raise HTTPException(
            status_code=500,
            detail="Failed to submit diagnostic quiz"
        ) from exc

    finally:
        db.close()

@app.get("/resources/profile/{profile_id}")
async def get_resources_by_profile(profile_id: int):
    db = SessionLocal()

    try:
        profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()

        if profile is None:
            raise HTTPException(status_code=404, detail="Profile not found")

        level = getattr(profile, "learning_level", None) or "beginner"

        if not profile.topic:
            raise HTTPException(status_code=400, detail="Profile has no topic.")
        if not profile.goal:
            raise HTTPException(status_code=400, detail="Profile has no goal.")
        if not profile.preferred_format:
            raise HTTPException(status_code=400, detail="Profile has no preferred format.")

        try:
            from app.resource_service import get_recommended_resources
        except ModuleNotFoundError as exc:
            raise HTTPException(
                status_code=503,
                detail="Resource recommendation dependency is not installed.",
            ) from exc

        resources = await get_recommended_resources(
            topic=profile.topic,
            level=level,
            preferred_format=profile.preferred_format,
            goal=profile.goal,
        )

        return {
            "profile_id": profile.id,

            "topic": profile.topic,
            "goal": profile.goal,
            "level": level,
            "preferred_format": profile.preferred_format,
            "resource_count": len(resources),
            "resources": resources,
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Resource generation failed for profile %s", profile_id)
        raise HTTPException(
            status_code=500,
            detail=f"Resource generation failed: {str(exc)}",
        ) from exc
    finally:
        db.close()


@app.get("/resources/{topic}")
def get_resources_by_topic(topic: str):
    db = SessionLocal()

    try:
        return db.query(Resource).filter(
            Resource.topic == topic
        ).all()
    finally:
        db.close()