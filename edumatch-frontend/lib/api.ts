import { saveProfileId } from "./profile-storage";

// All requests go through the Next.js proxy.
const API_URL = "/api/backend";

async function readJson<T = Record<string, unknown>>(
  response: Response
): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : `Request failed (${response.status}).`;

    throw new Error(detail);
  }

  if (!data || typeof data !== "object") {
    throw new Error("The backend returned an invalid response.");
  }

  return data as T;
}

// Shared request headers.
// JWT authentication is handled by the HttpOnly cookie in the proxy.
function getRequestHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
  };
}

export interface ProfileData {
  name: string;
  topic: string;
  preferred_format: "visual" | "interactive" | "text";
  goal: string;
}

export interface DiagnosticQuestion {
  id: number;
  question: string;
  options: string[];
  subtopic: string;
  difficulty: string;
}

export interface DiagnosticQuiz {
  profile_id: number;
  topic: string;
  question_count: number;
  questions: DiagnosticQuestion[];
}

export interface DiagnosticSubmissionResult {
  profile_id: number;
  score: number;
  total_questions: number;
  percentage: number;
  level: string;
  answer_review: {
    question_id: number;
    selected_answer: number;
    correct_answer: number;
    subtopic: string;
    explanation: string | null;
  }[];
}

export interface DashboardDiagnosticResult {
  score: number;
  total_questions: number;
  percentage: number;
  level: string;
}

export interface DashboardProfile {
  profile_id: number;
  topic: string;
  goal: string;
  preferred_format: string;
  current_level: string;
  latest_score: number | null;
  improvement: number | null;
  total_assessments: number;
  latest_diagnostic: DashboardDiagnosticResult | null;
}

export interface DashboardData {
  student: {
    id: number;
    name: string;
  };
  profiles: DashboardProfile[];
}

// Create student profile
export async function createProfile(profile: ProfileData) {
  const response = await fetch(`${API_URL}/profile`, {
    method: "POST",
    headers: getRequestHeaders(),
    credentials: "include",
    body: JSON.stringify(profile),
  });

  const data = await readJson<Record<string, unknown>>(response);
  const profileId = Number(data.profile_id);

  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    throw new Error("The backend did not return a valid profile ID.");
  }

  saveProfileId(profileId);

  return { ...data, profile_id: profileId };
}

// Generate diagnostic questions
export async function generateDiagnosticQuestions(profileId: number) {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    throw new Error(
      "A valid profile ID is required to generate a diagnostic."
    );
  }

  const response = await fetch(
    `${API_URL}/quiz/generate/${profileId}`,
    {
      method: "POST",
      headers: getRequestHeaders(),
      credentials: "include",
    }
  );

  const data = await readJson<{
    profile_id: number;
    questions: DiagnosticQuestion[];
  }>(response);

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error(
      "The backend did not generate any diagnostic questions."
    );
  }

  return data;
}

// Get diagnostic questions
export async function getDiagnosticQuestions(
  profileId: number
): Promise<DiagnosticQuiz> {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    throw new Error(
      "A valid profile ID is required to load diagnostic questions."
    );
  }

  const response = await fetch(`${API_URL}/quiz/${profileId}`, {
    method: "GET",
    headers: getRequestHeaders(),
    credentials: "include",
    cache: "no-store",
  });

  const data = await readJson<DiagnosticQuiz>(response);

  if (
    !Array.isArray(data.questions) ||
    data.questions.length === 0 ||
    typeof data.topic !== "string"
  ) {
    throw new Error("The backend returned an invalid diagnostic quiz.");
  }

  return data;
}

// Get currently authenticated user
export async function getCurrentUser() {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: getRequestHeaders(),
    credentials: "include",
    cache: "no-store",
  });

  const data = await readJson<{
    first_name: string;
    last_name: string;
  }>(response);

  if (
    typeof data.first_name !== "string" ||
    typeof data.last_name !== "string"
  ) {
    throw new Error("The backend returned invalid account information.");
  }

  return data;
}

// Get dashboard data for the currently authenticated user.
export async function getDashboard(): Promise<DashboardData> {
  const response = await fetch(`${API_URL}/dashboard`, {
    method: "GET",
    headers: getRequestHeaders(),
    credentials: "include",
    cache: "no-store",
  });

  const data = await readJson<DashboardData>(response);

  if (
    !data.student ||
    typeof data.student.name !== "string" ||
    !Array.isArray(data.profiles)
  ) {
    throw new Error("The backend returned invalid dashboard data.");
  }

  return data;
}

// Get logged-in user's student profile
export async function getMyProfile() {
  const response = await fetch(`${API_URL}/profile/me`, {
    method: "GET",
    headers: getRequestHeaders(),
    credentials: "include",
    cache: "no-store",
  });

  const data = await readJson<{
    profile_id: number;
    name: string;
    topic: string;
    preferred_format: ProfileData["preferred_format"];
    goal: string;
  }>(response);

  const profileId = Number(data.profile_id);

  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    throw new Error("The backend did not return a valid profile ID.");
  }

  saveProfileId(profileId);

  return { ...data, profile_id: profileId };
}

// Submit diagnostic quiz
export async function submitQuiz(
  profileId: number,
  answers: { question_id: number; selected_answer: number }[]
): Promise<DiagnosticSubmissionResult> {
  const response = await fetch(`${API_URL}/quiz/submit`, {
    method: "POST",
    headers: getRequestHeaders(),
    credentials: "include",
    body: JSON.stringify({
      profile_id: profileId,
      answers,
    }),
  });

  return readJson<DiagnosticSubmissionResult>(response);
}