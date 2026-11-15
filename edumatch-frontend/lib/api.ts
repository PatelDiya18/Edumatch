import { saveProfileId, clearStoredProfileId } from "./profile-storage";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

export interface SavedQuizResult extends DiagnosticSubmissionResult {
  topic: string;
  created_at: string | null;
}

export type TwinTopicStatus = "solid" | "fading" | "not_started";

export interface TwinTopic {
  id: string;
  name: string;
  status: TwinTopicStatus;
  strength: number | null;
  note: string;
}

export interface TwinTrendPoint {
  date: string;
  readiness: number;
}

export interface TwinData {
  profile_id: number;
  topicName: string;
  readiness: number | null;
  trend: TwinTrendPoint[];
  topics: TwinTopic[];
  history_available: boolean;
}

export interface DashboardDiagnosticResult {
  score: number;
  total_questions: number;
  percentage: number;
  level: string;
  created_at?: string | null;
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
  baseline?: DashboardDiagnosticResult | null;
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

// Sign out the currently authenticated user
export async function logoutUser(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: getRequestHeaders(),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to sign out. Please try again.");
  }

  clearStoredProfileId();
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
    !Array.isArray(data.profiles) ||
    data.profiles.some(
      (profile) =>
        !Number.isSafeInteger(profile.profile_id) ||
        typeof profile.topic !== "string" ||
        typeof profile.current_level !== "string"
    )
  ) {
    throw new Error("The backend returned invalid dashboard data.");
  }

  for (const profile of data.profiles) {
    for (const diagnostic of [
      profile.latest_diagnostic,
      profile.baseline,
    ]) {
      if (
        diagnostic != null &&
        (!Number.isFinite(diagnostic.percentage) ||
          !Number.isSafeInteger(diagnostic.score) ||
          !Number.isSafeInteger(diagnostic.total_questions) ||
          typeof diagnostic.level !== "string")
      ) {
        throw new Error("The backend returned invalid diagnostic data.");
      }
    }
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

// Get latest quiz result
export async function getLatestQuizResult(
  profileId: number,
  signal?: AbortSignal
): Promise<SavedQuizResult> {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    throw new Error(
      "A valid profile ID is required to load diagnostic results."
    );
  }

  const response = await fetch(`${API_URL}/quiz/results/${profileId}`, {
    method: "GET",
    headers: getRequestHeaders(),
    credentials: "include",
    cache: "no-store",
    signal,
  });

  const data = await readJson<SavedQuizResult>(response);

  if (
    typeof data.topic !== "string" ||
    !Number.isSafeInteger(data.profile_id) ||
    !Number.isSafeInteger(data.score) ||
    !Number.isSafeInteger(data.total_questions) ||
    !Number.isFinite(data.percentage) ||
    typeof data.level !== "string" ||
    (data.created_at !== null && typeof data.created_at !== "string") ||
    !Array.isArray(data.answer_review) ||
    data.answer_review.some((answer) => {
      if (!isRecord(answer)) return true;

      return (
        !Number.isSafeInteger(answer.question_id) ||
        !Number.isSafeInteger(answer.selected_answer) ||
        !Number.isSafeInteger(answer.correct_answer) ||
        typeof answer.subtopic !== "string" ||
        (answer.explanation !== null &&
          typeof answer.explanation !== "string")
      );
    })
  ) {
    throw new Error("The backend returned invalid diagnostic results.");
  }

  return data;
}

// Get Learning Twin data
export async function getTwin(
  signal?: AbortSignal
): Promise<TwinData> {
  const response = await fetch(`${API_URL}/twin`, {
    method: "GET",
    headers: getRequestHeaders(),
    credentials: "include",
    cache: "no-store",
    signal,
  });

  const data = await readJson<TwinData>(response);

  if (
    !Number.isSafeInteger(data.profile_id) ||
    typeof data.topicName !== "string" ||
    (data.readiness !== null && !Number.isFinite(data.readiness)) ||
    !Array.isArray(data.trend) ||
    data.trend.some((point) => {
      if (!isRecord(point)) return true;

      return (
        typeof point.date !== "string" ||
        !Number.isFinite(point.readiness)
      );
    }) ||
    !Array.isArray(data.topics) ||
    data.topics.some((topic) => {
      if (!isRecord(topic)) return true;

      return (
        typeof topic.id !== "string" ||
        typeof topic.name !== "string" ||
        !["solid", "fading", "not_started"].includes(
          String(topic.status)
        ) ||
        (topic.strength !== null && !Number.isFinite(topic.strength)) ||
        typeof topic.note !== "string"
      );
    }) ||
    typeof data.history_available !== "boolean"
  ) {
    throw new Error("The backend returned invalid Learning Twin data.");
  }

  return data;
}

