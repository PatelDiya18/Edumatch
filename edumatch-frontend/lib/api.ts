const API_URL = "/api/backend";

export type GeneratedDiagnosticQuestion = {
    question: string;
    options: string[];
    correct_answer: number;
    subtopic: string;
    difficulty: string;
    explanation: string;
};

type DiagnosticResponse = {
    detail?: string;
    error?: string;
    questions?: GeneratedDiagnosticQuestion[];
    topic?: string;
};

async function parseResponse(response: Response): Promise<unknown> {
    const body = await response.text();

    if (!body) {
        return null;
    }

    try {
        return JSON.parse(body);
    } catch {
        throw new Error(
            response.ok
                ? "The backend returned an invalid response."
                : `Backend error: ${response.status}`
        );
    }
}

async function readResponse<T>(response: Response): Promise<T> {
    const data = await parseResponse(response);

    if (typeof data !== "object" || data === null || Array.isArray(data)) {
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }
        throw new Error("The backend returned an invalid response.");
    }

    const errorData = data as { detail?: unknown; error?: unknown };

    if (!response.ok) {
        const detail = errorData.detail ?? errorData.error;
        throw new Error(
            typeof detail === "string"
                ? detail
                : detail
                    ? JSON.stringify(detail)
                    : `Backend error: ${response.status}`
        );
    }

    if (typeof errorData.error === "string" && errorData.error) {
        throw new Error(errorData.error);
    }

    return data as T;
}

function assertProfileId(profileId: number) {
    if (!Number.isInteger(profileId) || profileId <= 0) {
        throw new Error("A valid profile ID is required to load diagnostic questions.");
    }
}

export async function testBackend() {
    const response = await fetch(`${API_URL}/test`);
    return readResponse<{ message?: string }>(response);
}

export async function createProfile(profileData: {
    name: string;
    topic: string;
    preferred_format: string;
    goal: string;
}) {
    const response = await fetch(`${API_URL}/profile`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
    });

    return readResponse<{ profile_id: number }>(response);
}

export async function generateDiagnosticQuestions(profileId: number) {
    assertProfileId(profileId);

    const response = await fetch(
        `${API_URL}/quiz/generate/${profileId}`,
        {
            method: "POST",
        }
    );

    const data = await readResponse<DiagnosticResponse>(response);
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("The backend did not generate any diagnostic questions.");
    }

    return data.questions;
}

export async function getDiagnosticQuestions(profileId: number) {
    assertProfileId(profileId);

    const response = await fetch(`${API_URL}/quiz/${profileId}`);
    const data = await readResponse<DiagnosticResponse>(response);

    if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("The backend did not return any diagnostic questions.");
    }

    if (typeof data.topic !== "string" || !data.topic) {
        throw new Error("The backend did not return the diagnostic topic.");
    }

    return { topic: data.topic, questions: data.questions };
}

export async function submitQuiz(
    profileId: number,
    answers: {
        question_id: number;
        selected_answer: number;
    }[]
) {
    const response = await fetch(
        `${API_URL}/quiz/submit`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                profile_id: profileId,
                answers: answers,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const detail = data?.detail ?? data?.error;

        throw new Error(
            typeof detail === "string"
                ? detail
                : JSON.stringify(detail ?? "Failed to submit quiz")
        );
    }

    console.log("QUIZ RESULT FROM BACKEND:", data);

    return data;
}