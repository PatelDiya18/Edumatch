import logging
from .schemas import (
    StudentProfileCreate,
    StudentProfileResponse,
    Question,
    DiagnosticTest,
    QuizAnswer,
    QuizSubmission,
    QuizResult
)
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


# Create database tables
Base.metadata.create_all(bind=engine)


class ProfileCreate(BaseModel):
    name: str
    topic: str
    preferred_format: str
    goal: str


@app.get("/")
def root():
    return {"message": "EduMatch backend is running"}


@app.get("/test")
def test():
    return {"message": "Backend connection successful"}


@app.post("/profile")
def create_profile(profile: ProfileCreate):

    db = SessionLocal()

    new_profile = StudentProfile(
        name=profile.name,
        topic=profile.topic,
        preferred_format=profile.preferred_format,
        goal=profile.goal
    )

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    db.close()

    return {
        "message": "Profile created successfully",
        "profile_id": new_profile.id
    }
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
            "goal": new_profile.goal
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
class ResourceCreate(BaseModel):
    title: str
    description: str
    topic: str
    resource_type: str
    difficulty: str
    url: str
    estimated_minutes: int | None = None

@app.post("/resources")
def create_resource(resource: ResourceCreate):

    db = SessionLocal()

    new_resource = Resource(
        title=resource.title,
        description=resource.description,
        topic=resource.topic,
        resource_type=resource.resource_type,
        difficulty=resource.difficulty,
        url=resource.url,
        estimated_minutes=resource.estimated_minutes
    )

    db.add(new_resource)
    db.commit()
    db.refresh(new_resource)

    db.close()

    return {
        "message": "Resource created successfully",
        "resource_id": new_resource.id
    }
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

    return resources
@app.post("/quiz/generate/{profile_id}")
def generate_quiz(profile_id: int):
    db = SessionLocal()

    try:
        profile = db.query(StudentProfile).filter(
            StudentProfile.id == profile_id
        ).first()

        if profile is None:
            raise HTTPException(status_code=404, detail="Profile not found")

        ai_result = generate_diagnostic_questions(
            profile.topic,
            profile.goal
        )

        questions = ai_result["questions"]

        db.query(DiagnosticQuestion).filter(
            DiagnosticQuestion.profile_id == profile.id
        ).delete(synchronize_session=False)

        for q in questions:
            new_question = DiagnosticQuestion(
                profile_id=profile.id,
                topic=profile.topic,
                subtopic=q.subtopic,
                question=q.question,
                option_a=q.options[0],
                option_b=q.options[1],
                option_c=q.options[2],
                option_d=q.options[3],
                correct_answer=q.correct_answer,
                difficulty=q.difficulty,
                explanation=q.explanation
            )

            db.add(new_question)

        db.commit()

        return {
            "message": "Diagnostic test generated successfully",
            "profile_id": profile_id,
            "question_count": len(questions),
            "questions": [
                {
                    "question": question.question,
                    "options": question.options,
                    "correct_answer": question.correct_answer,
                    "subtopic": question.subtopic,
                    "difficulty": question.difficulty,
                    "explanation": question.explanation,
                }
                for question in questions
            ],
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception(
            "Failed to generate diagnostic questions for profile %s",
            profile_id,
        )
        raise HTTPException(
            status_code=502,
            detail="Unable to generate diagnostic questions. Please try again.",
        ) from exc
    finally:
        db.close()


@app.get("/quiz/{profile_id}")
def get_quiz(profile_id: int):
    db = SessionLocal()

    try:
        profile = db.query(StudentProfile).filter(
            StudentProfile.id == profile_id
        ).first()

        if profile is None:
            raise HTTPException(status_code=404, detail="Profile not found")

        questions = db.query(DiagnosticQuestion).filter(
            DiagnosticQuestion.profile_id == profile.id
        ).order_by(DiagnosticQuestion.id).all()

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
        questions = db.query(DiagnosticQuestion).filter(
            DiagnosticQuestion.profile_id == submission.profile_id
        ).all()

        if not questions:
            raise HTTPException(
                status_code=404,
                detail="No diagnostic quiz found for this profile"
            )

        score = 0

        question_map = {
            question.id: question
            for question in questions
        }

        for answer in submission.answers:

            question = question_map.get(answer.question_id)

            if question is None:
                continue

            if answer.selected_answer == question.correct_answer:
                score += 1

        total_questions = len(questions)

        percentage = (score / total_questions) * 100

        if percentage >= 80:
            level = "Advanced"
        elif percentage >= 50:
            level = "Intermediate"
        else:
            level = "Beginner"

        result = DiagnosticResult(
            profile_id=submission.profile_id,
            score=score,
            total_questions=total_questions,
            percentage=percentage,
            level=level
        )

        db.add(result)
        db.commit()
        db.refresh(result)

        return {
            "message": "Quiz submitted successfully",
            "profile_id": submission.profile_id,
            "score": score,
            "total_questions": total_questions,
            "percentage": percentage,
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
        )

    finally:
        db.close() 
@app.get("/resources/{profile_id}")
async def get_resources_by_profile(profile_id: int):

    db = SessionLocal()

    try:

        profile = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.id == profile_id
            )
            .first()
        )

        if profile is None:

            raise HTTPException(
                status_code=404,
                detail="Profile not found"
            )

        # ----------------------------------------------------
        # Get learning level
        # ----------------------------------------------------

        level = getattr(
            profile,
            "learning_level",
            None
        )

        if not level:

            level = "beginner"

        # ----------------------------------------------------
        # Validate profile
        # ----------------------------------------------------

        if not profile.topic:

            raise HTTPException(
                status_code=400,
                detail="Profile has no topic."
            )

        if not profile.goal:

            raise HTTPException(
                status_code=400,
                detail="Profile has no goal."
            )

        if not profile.preferred_format:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Profile has no preferred format."
                )
            )

        print("\n" + "=" * 70)
        print("EDUMATCH RESOURCE REQUEST")
        print("=" * 70)

        print(
            f"Profile ID: {profile.id}"
        )

        print(
            f"Topic: {profile.topic}"
        )

        print(
            f"Goal: {profile.goal}"
        )

        print(
            f"Level: {level}"
        )

        print(
            f"Preferred format: "
            f"{profile.preferred_format}"
        )

        # ----------------------------------------------------
        # Generate recommendations
        # ----------------------------------------------------

        resources = await get_recommended_resources(

            topic=profile.topic,

            level=level,

            preferred_format=(
                profile.preferred_format
            ),

            goal=profile.goal,
        )

        # ----------------------------------------------------
        # Return response
        # ----------------------------------------------------

        return {
            "profile_id": profile.id,

            "topic": profile.topic,

            "goal": profile.goal,

            "level": level,

            "preferred_format": (
                profile.preferred_format
            ),

            "resource_count": len(
                resources
            ),

            "resources": resources,
        }

    except HTTPException:

        raise

    except Exception as exc:

        db.rollback()

        logger.exception(
            "Resource generation failed "
            "for profile %s",
            profile_id
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Resource generation failed: "
                f"{str(exc)}"
            ),
        ) from exc

    finally:

        db.close()