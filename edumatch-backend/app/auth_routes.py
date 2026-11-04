
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    get_db,
    get_password_hash,
    verify_password,
)
from app.models import User, StudentProfile
from app.auth_schemas import (
    SignupRequest,
    LoginRequest,
    AuthResponse,
    UserResponse
)


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()

    existing_user = db.query(User.id).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    user = User(
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        email=email,
        password_hash=get_password_hash(data.password),
        phone_number=data.phone_number.strip()
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        ) from exc

    token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "has_profile": False,
        "profile_id": None,
    }


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = str(data.email).strip().lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user or not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password."
        )

    profile_id = db.scalar(
        select(StudentProfile.id)
        .where(StudentProfile.user_id == user.id)
        .order_by(StudentProfile.id.desc())
        .limit(1)
    )

    token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "has_profile": profile_id is not None,
        "profile_id": profile_id,
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
