"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
    getRecommendedResources,
    type ResourceResponse,
} from "@/lib/resources";
import { getStoredProfileId, saveProfileId } from "@/lib/profile-storage";


export default function ResourcesPage() {
    return (
        <Suspense
            fallback={
                <main className="p-8">
                    <h1 className="text-2xl font-bold">
                        Finding your resources...
                    </h1>

                    <p className="mt-2">
                        EduMatch is finding resources
                        based on your learning profile.
                    </p>
                </main>
            }
        >
            <ResourcesContent />
        </Suspense>
    );
}

function ResourcesContent() {
    const searchParams = useSearchParams();

    const profileId = searchParams.get("id");

    const [data, setData] =
        useState<ResourceResponse | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");


    useEffect(() => {
        async function loadResources() {
            try {
                const resolvedProfileId =
                    profileId === null
                        ? getStoredProfileId()
                        : Number(profileId);

                if (resolvedProfileId === null) {
                    setError(
                        "Student profile ID is missing. Please complete onboarding and the diagnostic quiz."
                    );
                    return;
                }

                if (!Number.isSafeInteger(resolvedProfileId) || resolvedProfileId <= 0) {
                    setError("Invalid student profile ID.");
                    return;
                }

                saveProfileId(resolvedProfileId);
                console.log(
                    "Fetching resources for profile:",
                    resolvedProfileId
                );

                const result =
                    await getRecommendedResources(resolvedProfileId);

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


            

<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

    {data.preferred_recommendations.map(
        (resource, index) => (

            <article
                key={resource.url}
                className="rounded-xl border p-6 shadow-sm"
            >

                <p className="text-sm font-medium text-green-600">
                    Preferred Resource #{index + 1}
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                    {resource.title}
                </h2>

                <p className="mt-3 text-gray-600">
                    {resource.reason}
                </p>

                <div className="mt-4 flex flex-wrap gap-4 text-sm">

                    <span className="capitalize">
                        Format: {resource.format}
                    </span>

                    <span>
                        Match: {resource.relevance_score}/100
                    </span>

                </div>

                <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-block rounded-lg border px-4 py-2 hover:bg-gray-100"
                >
                    Open Resource →
                </a>

            </article>
        )
    )}

</div>


{/* Alternative Format Resources */}

{data.alternative_recommendations.length > 0 && (

    <section className="mt-12">

        <h2 className="text-2xl font-bold">
            You Should Also Explore
        </h2>

        <p className="mt-2 text-gray-500">
            We found fewer resources in your preferred learning
            format. These alternatives may also help you achieve
            your learning goal.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {data.alternative_recommendations.map(
                (resource, index) => (

                    <article
                        key={resource.url}
                        className="rounded-xl border border-orange-200 p-6 shadow-sm"
                    >

                        <p className="text-sm font-medium text-orange-600">
                            Alternative Resource #{index + 1}
                        </p>

                        <h2 className="mt-2 text-xl font-semibold">
                            {resource.title}
                        </h2>

                        <p className="mt-3 text-gray-600">
                            {resource.reason}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-4 text-sm">

                            <span className="capitalize">
                                Format: {resource.format}
                            </span>

                            <span>
                                Match: {resource.relevance_score}/100
                            </span>

                        </div>

                        <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 inline-block rounded-lg border px-4 py-2 hover:bg-gray-100"
                        >
                            Open Resource →
                        </a>

                    </article>
                )
            )}

        </div>

    </section>

)}

        </main>
    );
}