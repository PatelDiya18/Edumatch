import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .database import Base, SessionLocal, engine
from .models import DiagnosticQuestion, DiagnosticResult, Resource, StudentProfile
from .schemas import QuizSubmission

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
            preferred_format=profile.preferred_format.strip(),
            goal=profile.goal.strip(),
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
    try:
        return db.query(Resource).all()
    finally:
        db.close()


@app.get("/resources/{topic}")
def get_resources_by_topic(topic: str):
    db = SessionLocal()
    try:
        return db.query(Resource).filter(Resource.topic == topic).all()
    finally:
        db.close()


@app.post("/quiz/generate/{profile_id}")
def generate_quiz(profile_id: int):
    db = SessionLocal()

    try:
        profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()

        if profile is None:
            raise HTTPException(status_code=404, detail="Profile not found")

        try:
            from .ai_service import generate_diagnostic_questions
        except ModuleNotFoundError as exc:
            raise HTTPException(
                status_code=503,
                detail="AI quiz generation dependency is not installed.",
            ) from exc

        ai_result = generate_diagnostic_questions(profile.topic, profile.goal)
        questions = ai_result.get("questions")

        if not isinstance(questions, list):
            raise HTTPException(
                status_code=502,
                detail="Unable to generate diagnostic questions. Invalid response format.",
            )

        db.query(DiagnosticQuestion).filter(
            DiagnosticQuestion.profile_id == profile.id
        ).delete(synchronize_session=False)

        created_questions = []
        for q in questions:
            if not isinstance(q, dict):
                continue

            option_list = q.get("options") or []
            if len(option_list) != 4:
                raise HTTPException(
                    status_code=502,
                    detail="A generated question is missing the required answer choices.",
                )

            db_question = DiagnosticQuestion(
                profile_id=profile.id,
                topic=profile.topic,
                subtopic=q["subtopic"],
                question=q["question"],
                option_a=option_list[0],
                option_b=option_list[1],
                option_c=option_list[2],
                option_d=option_list[3],
                correct_answer=int(q["correct_answer"]),
                difficulty=q["difficulty"],
                explanation=q["explanation"],
            )
            db.add(db_question)
            created_questions.append(db_question)

        db.commit()

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
                        question.option_d,
                    ],
                    "correct_answer": question.correct_answer,
                    "subtopic": question.subtopic,
                    "difficulty": question.difficulty,
                    "explanation": question.explanation,
                }
                for question in created_questions
            ],
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to generate diagnostic questions for profile %s", profile_id)
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
        questions = db.query(DiagnosticQuestion).filter(
            DiagnosticQuestion.profile_id == submission.profile_id
        ).all()

        if not questions:
            raise HTTPException(
                status_code=404,
                detail="No diagnostic quiz found for this profile",
            )

        score = 0
        question_map = {question.id: question for question in questions}

        for answer in submission.answers:
            question = question_map.get(answer.question_id)
            if question is None:
                continue
            if answer.selected_answer == question.correct_answer:
                score += 1

        total_questions = len(questions)
        percentage = (score / total_questions) * 100 if total_questions else 0

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
            level=level,
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
            "level": level,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Quiz submission failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to submit diagnostic quiz",
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