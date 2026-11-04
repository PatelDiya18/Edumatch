
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Annotated


class SignupRequest(BaseModel):
    first_name: Annotated[str, Field(min_length=1, max_length=100)]
    last_name: Annotated[str, Field(min_length=1, max_length=100)]
    email: EmailStr
    password: Annotated[str, Field(min_length=8, max_length=128)]
    phone_number: Annotated[str, Field(min_length=7, max_length=20)]

    @field_validator("first_name", "last_name", "phone_number")
    @classmethod
    def require_non_whitespace(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    has_profile: bool
    profile_id: int | None = None
