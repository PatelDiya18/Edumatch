const API_URL = "/api/backend";

export type ResourceFormat = "visual" | "interactive" | "text";

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
    resources: Resource[];
}

export async function getRecommendedResources(
    profileId: number | string
): Promise<ResourceResponse> {
    const parsedProfileId = Number(profileId);

    if (!Number.isSafeInteger(parsedProfileId) || parsedProfileId <= 0) {
        throw new Error("Invalid profile ID.");
    }

    const token = ""; // Do not use this if authentication is cookie-based.

    const response = await fetch(
        `/api/backend/resources/profile/${parsedProfileId}`,
        {
            method: "GET",
            credentials: "include",
            cache: "no-store",
        }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.detail || "Unable to load resources.");
    }

    if (
        !Array.isArray(data?.preferred_recommendations) ||
        !Array.isArray(data?.alternative_recommendations)
    ) {
        throw new Error("Invalid resource response from backend.");
    }

    return {
        ...data,
        resources: [
            ...data.preferred_recommendations,
            ...data.alternative_recommendations,
        ],
    } as ResourceResponse;
}