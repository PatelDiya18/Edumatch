import logging

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from .database import Base, SessionLocal, engine
from .models import (
    DiagnosticQuestion,
    DiagnosticResult,
    LearningProgress,
    Resource,
    StudentProfile,
    User,
)
from .ai_service import generate_diagnostic_questions
from app.resource_service import get_recommended_resources
from app.auth_routes import router as auth_router
from app.auth import get_current_user, get_db
from app.migrate_auth import migrate_auth_schema
from app.tavily_mcp import TavilySearchError

logger = logging.getLogger(__name__)

app = FastAPI(title="EduMatch API")
app.include_router(auth_router)

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
migrate_auth_schema()


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
    selected_answer: int = Field(ge=0, le=3)


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
def create_profile(
    profile: ProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        new_profile = StudentProfile(
            user_id=current_user.id,
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
            "user_id": new_profile.user_id,
            "name": new_profile.name,
            "topic": new_profile.topic,
            "preferred_format": new_profile.preferred_format,
            "goal": new_profile.goal,
        }
    except Exception:
        db.rollback()
        raise


@app.get("/profile/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = (
        db.query(StudentProfile)
        .filter(StudentProfile.user_id == current_user.id)
        .order_by(StudentProfile.id.desc())
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="No profile found for this user.")

    return {
        "profile_id": profile.id,
        "name": profile.name,
        "topic": profile.topic,
        "preferred_format": profile.preferred_format,
        "goal": profile.goal,
    }


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
            "user_id": new_resource.user_id,
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
        resources = db.query(Resource).all()
        return resources

    finally:
        db.close()


@app.get("/resources/{topic}")
def get_resources_by_topic(topic: str):
    db = SessionLocal()

    try:
        resources = db.query(Resource).filter(
            Resource.topic == topic
        ).all()

        return resources

    finally:
        db.close()


@app.post("/quiz/generate/{profile_id}")
def generate_quiz(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(StudentProfile).filter(
        StudentProfile.id == profile_id,
        StudentProfile.user_id == current_user.id,
    ).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found for this user.")

    try:
        generated = generate_diagnostic_questions(profile.topic, profile.goal)
        generated_questions = generated.get("questions")
        if not isinstance(generated_questions, list) or len(generated_questions) != 10:
            raise ValueError("The quiz generator must return exactly 10 questions.")

        db.query(DiagnosticQuestion).filter(
            DiagnosticQuestion.profile_id == profile.id
        ).delete(synchronize_session=False)

        questions = []
        for item in generated_questions:
            if not isinstance(item, dict) or len(item.get("options", [])) != 4:
                raise ValueError("The quiz generator returned an invalid question.")

            question = DiagnosticQuestion(
                profile_id=profile.id,
                topic=profile.topic,
                subtopic=item["subtopic"],
                question=item["question"],
                option_a=item["options"][0],
                option_b=item["options"][1],
                option_c=item["options"][2],
                option_d=item["options"][3],
                correct_answer=item["correct_answer"],
                difficulty=item["difficulty"],
                explanation=item["explanation"],
            )
            db.add(question)
            questions.append(question)

        db.flush()
        response_questions = [
            {
                "id": question.id,
                "question": question.question,
                "options": [
                    question.option_a,
                    question.option_b,
                    question.option_c,
                    question.option_d,
                ],
                "subtopic": question.subtopic,
                "difficulty": question.difficulty,
            }
            for question in questions
        ]
        db.commit()
        return {
            "profile_id": profile.id,
            "topic": profile.topic,
            "question_count": len(response_questions),
            "questions": response_questions,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("Quiz generation failed for profile %s", profile_id)
        raise HTTPException(
            status_code=502,
            detail="Unable to generate your personalized diagnostic. Please try again.",
        ) from exc


@app.get("/quiz/{profile_id}")
def get_quiz(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(StudentProfile).filter(
        StudentProfile.id == profile_id,
        StudentProfile.user_id == current_user.id,
    ).first()
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
                "id": question.id,
                "question": question.question,
                "options": [
                    question.option_a,
                    question.option_b,
                    question.option_c,
                    question.option_d,
                ],
                "subtopic": question.subtopic,
                "difficulty": question.difficulty,
            }
            for question in questions
        ],
    }



@app.post("/quiz/submit")
def submit_quiz(
    submission: QuizSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Check whether the profile exists
        # and belongs to the logged-in user
        profile = db.query(StudentProfile).filter(
            StudentProfile.id == submission.profile_id,
            StudentProfile.user_id == current_user.id
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

        # 7. Save assessment result in database
        result = DiagnosticResult(
            profile_id=submission.profile_id,
            user_id=current_user.id,
            score=score,
            total_questions=total_questions,
            percentage=percentage,
            level=level
        )

        db.add(result)

        db.add(
            LearningProgress(
                profile_id=profile.id,
                assessment_type="diagnostic",
                score=percentage,
                level=level,
            )
        )

        answer_by_question_id = {
            answer.question_id: answer for answer in submission.answers
        }

        # 9. Commit and refresh database record
        db.commit()
        db.refresh(result)

        # 10. Return assessment result
        return {
            "message": "Quiz submitted successfully",
            "profile_id": submission.profile_id,
            "score": score,
            "total_questions": total_questions,
            "correct_answers": score,
            "wrong_answers": total_questions - score,
            "percentage": round(percentage, 2),
            "level": level,
            "answer_review": [
                {
                    "question_id": question.id,
                    "selected_answer": answer_by_question_id[question.id].selected_answer,
                    "correct_answer": question.correct_answer,
                    "subtopic": question.subtopic,
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
        logger.exception("Quiz submission failed")

        raise HTTPException(
            status_code=500,
            detail="Failed to submit diagnostic quiz"
        ) from exc


@app.get("/resources/profile/{profile_id}")
async def get_resources_by_profile(
    profile_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    try:
        profile = (
            db.query(StudentProfile)
            .filter(
                StudentProfile.id == profile_id,
                StudentProfile.user_id == current_user.id,
            )
            .first()
        )

        if profile is None:
            raise HTTPException(
                status_code=404,
                detail="Profile not found"
            )

        latest_result = (
            db.query(DiagnosticResult)
            .filter(
                DiagnosticResult.user_id == current_user.id,
                DiagnosticResult.profile_id == profile.id,
            )
            .order_by(
                DiagnosticResult.created_at.desc(),
                DiagnosticResult.id.desc(),
            )
            .first()
        )
        level = latest_result.level if latest_result else "beginner"

        if not profile.topic:
            raise HTTPException(status_code=400, detail="Profile has no topic.")

        if not profile.goal:
            raise HTTPException(status_code=400, detail="Profile has no goal.")

        if not profile.preferred_format:
            raise HTTPException(status_code=400, detail="Profile has no preferred format.")

        resources = await get_recommended_resources(
            topic=profile.topic,
            level=level,
            preferred_format=profile.preferred_format,
            goal=profile.goal,
        )

        preferred = resources.get("preferred_recommendations", [])
        alternatives = resources.get("alternative_recommendations", [])

        return {
            "profile_id": profile.id,
            "student_name": profile.name,
            "topic": profile.topic,
            "goal": profile.goal,
            "level": level,
            "preferred_format": resources.get(
                "preferred_format",
                profile.preferred_format
            ),
            "resource_count": len(preferred) + len(alternatives),
            "preferred_recommendations": preferred,
            "alternative_recommendations": alternatives,
        }

    except HTTPException:
        raise

    except TavilySearchError as exc:
        logger.error(
            "Tavily resource search failed for profile %s: %s",
            profile_id,
            exc,
        )
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()
        logger.exception(
            "Resource generation failed for profile %s",
            profile_id
        )

        raise HTTPException(
            status_code=500,
            detail=f"Resource generation failed: {str(exc)}"
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

@app.get("/dashboard")
def get_dashboard(
    current_user: User = Depends(get_current_user)
):
    db = SessionLocal()

    try:
        profiles = (
            db.query(StudentProfile)
            .filter(StudentProfile.user_id == current_user.id)
            .order_by(StudentProfile.id.desc())
            .all()
        )

        dashboard_profiles = []

        for profile in profiles:

            progress_records = (
                db.query(LearningProgress)
                .filter(
                    LearningProgress.profile_id == profile.id
                )
                .order_by(
                    LearningProgress.attempted_at.desc()
                )
                .all()
            )

            latest = progress_records[0] if progress_records else None

            previous = (
                progress_records[1]
                if len(progress_records) > 1
                else None
            )

            improvement = None

            if latest and previous:
                improvement = round(
                    latest.score - previous.score, 2
                )

            latest_diagnostic = (
                db.query(DiagnosticResult)
                .filter(
                    DiagnosticResult.user_id == current_user.id,
                    DiagnosticResult.profile_id == profile.id,
                )
                .order_by(
                    DiagnosticResult.created_at.desc(),
                    DiagnosticResult.id.desc(),
                )
                .first()
            )

            dashboard_profiles.append({
                "profile_id": profile.id,
                "topic": profile.topic,
                "goal": profile.goal,
                "preferred_format": profile.preferred_format,
                "current_level": (
                    latest_diagnostic.level
                    if latest_diagnostic
                    else latest.level
                    if latest
                    else getattr(profile, "learning_level", None)
                    or "Not assessed"
                ),
                "latest_score": (
                    latest_diagnostic.percentage
                    if latest_diagnostic
                    else latest.score
                    if latest
                    else None
                ),
                "improvement": improvement,
                "total_assessments": len(progress_records),
                "latest_diagnostic": (
                    {
                        "score": latest_diagnostic.score,
                        "total_questions": latest_diagnostic.total_questions,
                        "percentage": latest_diagnostic.percentage,
                        "level": latest_diagnostic.level,
                    }
                    if latest_diagnostic
                    else None
                ),
            })

        return {
            "student": {
                "id": current_user.id,
                "name": (
                    current_user.first_name
                    + " "
                    + current_user.last_name
                )
            },
            "profiles": dashboard_profiles
        }

    finally:
        db.close()
