from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS so your frontend can communicate with this backend securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sample Resource Database
resources = [
    {"id": 1, "topic": "Pointers", "title": "Beginner Pointer Cheat Sheet", "difficulty": 1, "link": "https://example.com/p1"},
    {"id": 2, "topic": "Pointers", "title": "Pointers Explained Visually", "difficulty": 1, "link": "https://example.com/p2"},
    {"id": 3, "topic": "Pointers", "title": "Memory Management & Pointers", "difficulty": 2, "link": "https://example.com/p3"},
    {"id": 4, "topic": "Pointers", "title": "Advanced Pointer Arithmetic", "difficulty": 3, "link": "https://example.com/p4"},
]

# Pydantic models to automatically validate incoming request bodies
class QuizSubmission(BaseModel):
    score: int

class FeedbackSubmission(BaseModel):
    currentResourceId: int
    feedback: str

# API Endpoint 1: Evaluate Quiz & Return Top 3 Resources
@app.post("/")
async def evaluate_quiz(data: QuizSubmission):
    # Determine target difficulty based on student quiz score
    if data.score < 50:
        target_difficulty = 1
    elif data.score < 80:
        target_difficulty = 2
    else:
        target_difficulty = 3

    filtered = [r for r in resources if r["difficulty"] == target_difficulty][:3]
    return {"status": "success", "recommendations": filtered}

# API Endpoint 2: Handle Feedback ("Too Hard" triggers resource mutation)
@app.post("/api/feedback")
async def handle_feedback(data: FeedbackSubmission):
    if data.feedback == "TOO_DIFFICULT":
        # Find a simpler replacement resource
        replacement = next((r for r in resources if r["difficulty"] == 1 and r["id"] != data.currentResourceId), None)
        if replacement:
            return {"status": "updated", "newResource": replacement}
            
    return {"status": "kept"}