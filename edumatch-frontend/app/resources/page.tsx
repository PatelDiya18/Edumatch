"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
    getRecommendedResources,
    type ResourceResponse,
} from "@/lib/resources";


export default function ResourcesPage() {
    const searchParams = useSearchParams();

    const profileId = searchParams.get("profileId");

    const [data, setData] =
        useState<ResourceResponse | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");


    useEffect(() => {
        async function loadResources() {

            if (!profileId) {
                setError(
                    "Student profile ID is missing. Please complete onboarding and the diagnostic quiz."
                );

                setLoading(false);
                return;
            }

            const id = Number(profileId);

            if (!Number.isInteger(id) || id <= 0) {
                setError("Invalid student profile ID.");
                setLoading(false);
                return;
            }

            try {
                console.log(
                    "Fetching resources for profile:",
                    id
                );

                const result =
                    await getRecommendedResources(id);

                console.log(
                    "Resources received:",
                    result
                );

                setData(result);

            } catch (err) {
                console.error(
                    "Resource error:",
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load resources."
                );

            } finally {
                setLoading(false);
            }
        }

        loadResources();
    }, [profileId]);


    if (loading) {
        return (
            <main className="p-8">
                <h1 className="text-2xl font-bold">
                    Finding your resources...
                </h1>

                <p className="mt-2">
                    EduMatch is finding resources
                    based on your learning profile.
                </p>
            </main>
        );
    }


    if (error) {
        return (
            <main className="p-8">
                <h1 className="text-2xl font-bold">
                    Unable to load resources
                </h1>

                <p className="mt-3 text-red-500">
                    {error}
                </p>
            </main>
        );
    }


    if (!data) {
        return null;
    }


    return (
        <main className="min-h-screen p-8">

            <div className="mb-8">

                <h1 className="text-3xl font-bold">
                    Resources for {data.topic}
                </h1>

                <p className="mt-2">
                    Personalized resources for{" "}
                    {data.student_name}.
                </p>

                <div className="mt-4 space-y-1">

                    <p>
                        <strong>Level:</strong>{" "}
                        {data.level}
                    </p>

                    <p>
                        <strong>
                            Preferred format:
                        </strong>{" "}
                        {data.preferred_format}
                    </p>

                    <p>
                        <strong>Goal:</strong>{" "}
                        {data.goal}
                    </p>

                </div>

            </div>


            <div className="grid gap-6">

                {data.resources.map(
                    (resource, index) => (

                        <article
                            key={resource.url}
                            className="rounded-xl border p-6 shadow-sm"
                        >

                            <p className="text-sm text-gray-500">
                                Resource #{index + 1}
                            </p>

                            <h2 className="mt-2 text-xl font-semibold">
                                {resource.title}
                            </h2>

                            <p className="mt-3">
                                {resource.reason}
                            </p>

                            <div className="mt-4 flex gap-4">

                                <span>
                                    Format:{" "}
                                    {resource.format}
                                </span>

                                <span>
                                    Match:{" "}
                                    {resource.relevance_score}/100
                                </span>

                            </div>

                            <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-5 inline-block rounded-lg border px-4 py-2"
                            >
                                Open Resource →
                            </a>

                        </article>
                    )
                )}

            </div>

        </main>
    );
}