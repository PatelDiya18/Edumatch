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
    resources: Resource[];
}


export async function getRecommendedResources(
    profileId: number
): Promise<ResourceResponse> {

    if (!Number.isInteger(profileId) || profileId <= 0) {
        throw new Error(
            "Invalid student profile ID."
        );
    }


    const response = await fetch(
        `${API_URL}/resources/${profileId}`,
        {
            cache: "no-store",
        }
    );


    let data: any;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            "Backend returned an invalid response."
        );
    }


    if (!response.ok) {

        const detail =
            data?.detail ||
            "Failed to fetch resources.";

        throw new Error(
            typeof detail === "string"
                ? detail
                : JSON.stringify(detail)
        );
    }


    if (
        !data ||
        !Array.isArray(data.resources)
    ) {
        throw new Error(
            "Backend returned invalid resource data."
        );
    }


    return data as ResourceResponse;
}