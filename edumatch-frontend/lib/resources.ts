const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000";


export type ResourceFormat =
    | "visual"
    | "interactive"
    | "text";


export interface Resource {
    title: string;
    url: string;
    format: ResourceFormat;
    reason: string;
    relevance_score: number;
}


export interface ResourceResponse {
    profile_id: number;
    student_name: string;
    topic: string;
    goal: string;
    level: string;
    preferred_format: ResourceFormat;
    resource_count: number;
    preferred_recommendations: Resource[];
    alternative_recommendations: Resource[];
}
export async function getRecommendedResources(
  profileId: number | string
): Promise<ResourceResponse> {
  const response = await fetch(
    `${API_URL}/resources/profile/${profileId}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || "Unable to load resources");
  }

  if (
    !Array.isArray(data?.preferred_recommendations) ||
    !Array.isArray(data?.alternative_recommendations)
  ) {
    throw new Error("Invalid resource response from backend.");
  }

  return data as ResourceResponse;
}