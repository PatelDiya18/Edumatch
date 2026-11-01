from importlib import resources
import json
import re
from typing import Any

from groq import Groq

from .tavily_mcp import search_tavily


# ============================================================
# CONFIGURATION
# ============================================================

MAX_TAVILY_RESULTS = 10
MAX_RECOMMENDATIONS = 3

GROQ_MODEL = "openai/gpt-oss-120b"


# ============================================================
# GROQ CLIENT
# ============================================================

# ============================================================
# FORMAT DEFINITIONS
# ============================================================

FORMAT_DEFINITIONS = {
    "visual": (
        "Videos, video courses, animations, visual explanations, "
        "diagram-based learning, demonstrations."
    ),

    "interactive": (
        "Interactive coding platforms, quizzes, exercises, "
        "simulations, hands-on learning activities."
    ),

    "text": (
        "Written tutorials, official documentation, articles, "
        "guides, books, and text-based courses."
    ),
}


# ============================================================
# BASIC CLEANING
# ============================================================

def clean_text(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip()


# ============================================================
# NORMALIZE LEARNING FORMAT
# ============================================================


def normalize_format(preferred_format: str) -> str:

    value = clean_text(preferred_format).lower()

    aliases = {
        # Visual
        "video": "visual",
        "videos": "visual",
        "visuals": "visual",
        "visual learning": "visual",
        "visual tutorial": "visual",
        "video tutorial": "visual",
        "video tutorials": "visual",
        "animation": "visual",
        "animations": "visual",

        # Interactive
        "interactive learning": "interactive",
        "interactive tutorial": "interactive",
        "practice": "interactive",
        "hands-on": "interactive",
        "hands on": "interactive",
        "coding exercises": "interactive",
        "exercises": "interactive",
        "quiz": "interactive",
        "quizzes": "interactive",

        # Text
        "written": "text",
        "article": "text",
        "articles": "text",
        "documentation": "text",
        "reading": "text",
        "text-based": "text",
        "text based": "text",
        "written tutorial": "text",
        "written tutorials": "text",
        "notes": "text",
        "ebooks": "text",
    }

    value = aliases.get(value, value)

    if value not in FORMAT_DEFINITIONS:
        raise ValueError(
            "preferred_format must be one of: "
            "visual, interactive, text"
        )

    return value


# ============================================================
# NORMALIZE LEVEL
# ============================================================

def normalize_level(level: str) -> str:

    value = clean_text(level).lower()

    aliases = {
        "beginner": "beginner",
        "beginners": "beginner",

        "intermediate": "intermediate",

        "advanced": "advanced",
    }

    value = aliases.get(value, value)

    if value not in {
        "beginner",
        "intermediate",
        "advanced",
    }:
        raise ValueError(
            "learning level must be beginner, "
            "intermediate, or advanced"
        )

    return value


# ============================================================
# BUILD TAVILY SEARCH QUERY
# ============================================================

def build_search_query(
    topic: str,
    level: str,
    preferred_format: str,
    goal: str,
) -> str:

    topic = clean_text(topic)
    goal = clean_text(goal)

    level = normalize_level(level)
    preferred_format = normalize_format(preferred_format)

    if not topic:
        raise ValueError("Topic is required.")

    if not goal:
        raise ValueError("Learning goal is required.")

    format_queries = {
        "visual": (
            "video tutorials, educational videos, "
            "visual explanations, animations and demonstrations"
        ),
        "interactive": (
            "interactive tutorials, coding exercises, "
            "hands-on projects, quizzes and practice platforms"
        ),
        "text": (
            "official documentation, written tutorials, "
            "educational articles, guides and study notes"
        ),
    }

    query = (
    f"Find high-quality beginner learning resources for {topic}. "
    f"The student's goal is {goal}. "
    f"Find resources across all three formats: "
    f"interactive tutorials, coding exercises and practice platforms; "
    f"visual video lessons, demonstrations and animations; "
    f"text-based documentation, articles and written tutorials. "
    f"Prioritize reputable educational websites and resources "
    f"suitable for beginner learners. "
    f"Return a diverse collection of relevant resources."
)

    return query


# ============================================================
# EXTRACT TAVILY RESULTS
# ============================================================

def extract_tavily_results(result: Any) -> list[dict]:

    """
    Converts different possible Tavily MCP response structures
    into a simple list of resources.
    """

    if result is None:
        return []

    # --------------------------------------------------------
    # If MCP result has structured_content
    # --------------------------------------------------------

    structured = getattr(
        result,
        "structured_content",
        None
    )

    if isinstance(structured, dict):

        possible_results = (
            structured.get("results")
            or structured.get("data")
            or structured.get("items")
        )

        if isinstance(possible_results, list):
            return normalize_results(possible_results)

    # --------------------------------------------------------
    # Direct dictionary
    # --------------------------------------------------------

    if isinstance(result, dict):

        possible_results = (
            result.get("results")
            or result.get("data")
            or result.get("items")
        )

        if isinstance(possible_results, list):
            return normalize_results(possible_results)

    # --------------------------------------------------------
    # MCP content
    # --------------------------------------------------------

    content = getattr(result, "content", None)

    if isinstance(content, list):

        extracted = []

        for item in content:

            text = getattr(item, "text", None)

            if not text:
                continue

            try:

                parsed = json.loads(text)

                if isinstance(parsed, dict):

                    possible_results = (
                        parsed.get("results")
                        or parsed.get("data")
                        or parsed.get("items")
                    )

                    if isinstance(
                        possible_results,
                        list
                    ):
                        extracted.extend(
                            possible_results
                        )

            except json.JSONDecodeError:

                continue

        if extracted:
            return normalize_results(extracted)

    return []


# ============================================================
# NORMALIZE TAVILY RESULTS
# ============================================================

def normalize_results(
    results: list
) -> list[dict]:

    normalized = []

    for item in results:

        if not isinstance(item, dict):
            continue

        title = clean_text(
            item.get("title")
        )

        url = clean_text(
            item.get("url")
        )

        content = clean_text(
            item.get("content")
            or item.get("snippet")
            or item.get("description")
        )

        if not title or not url:
            continue

        normalized.append(
            {
                "title": title,
                "url": url,
                "description": content,
            }
        )

    return normalized


# ============================================================
# SEARCH REAL RESOURCES
# ============================================================

async def search_real_resources(
    topic: str,
    level: str,
    preferred_format: str,
    goal: str,
) -> list[dict]:

    query = build_search_query(
        topic=topic,
        level=level,
        preferred_format=preferred_format,
        goal=goal,
    )

    print("\n" + "=" * 70)
    print("EDUMATCH TAVILY SEARCH")
    print("=" * 70)

    print("Query:")
    print(query)

    result = await search_tavily(
        query=query,
        max_results=MAX_TAVILY_RESULTS,
    )

    resources = extract_tavily_results(result)

    print(
        f"Tavily returned {len(resources)} usable resources."
    )

    if not resources:
        raise RuntimeError(
            "Tavily did not return any usable resources."
        )

    return resources[:MAX_TAVILY_RESULTS]


# ============================================================
# BUILD GROQ PROMPT
# ============================================================



def build_groq_prompt(
    topic: str,
    level: str,
    preferred_format: str,
    goal: str,
    resources: list[dict],
) -> str:

    preferred_format = normalize_format(preferred_format)

    format_description = FORMAT_DEFINITIONS[preferred_format]

    resource_text = ""

    for index, resource in enumerate(resources, start=1):
        resource_text += (
            f"\nRESOURCE {index}\n"
            f"Title: {resource.get('title', '')}\n"
            f"URL: {resource.get('url', '')}\n"
            f"Description: {resource.get('description', '')}\n"
        )

    return f"""
You are the educational resource recommendation engine for EduMatch.

STUDENT PROFILE

Topic: {topic}
Learning level: {level}
Learning goal: {goal}
Preferred format: {preferred_format}

FORMAT DEFINITION:
{format_description}

YOUR TASK

Analyze all the resources provided below.

Select a maximum of 3 resources in total.

Prioritize resources matching the student's preferred format.
If fewer than 3 suitable preferred-format resources exist,
fill the remaining slots with the best relevant resources
from other formats.

STRICT RULES:

1. Select resources ONLY from the provided list.
2. Use the exact original URL. Never invent or modify URLs.
3. Do not return duplicate URLs.
4. Prioritize the student's preferred format.
5. Alternative resources must use a different format.
6. Consider topic relevance, learning level, learning goal,
   educational quality and usefulness.
7. Do not select unsuitable resources just to reach 3.
8. Return empty arrays if no suitable resources exist.

SUPPORTED FORMATS:

VISUAL:
Videos, animations, visual explanations, diagrams,
demonstrations and video courses.

INTERACTIVE:
Coding practice, quizzes, exercises, simulations,
interactive lessons and hands-on activities.

TEXT:
Documentation, articles, written tutorials,
guides, books and written courses.

OUTPUT FORMAT:

Return ONLY valid JSON in this exact structure:

{{
    "preferred_recommendations": [
        {{
            "title": "Resource title",
            "url": "Exact Tavily URL",
            "format": "{preferred_format}",
            "reason": "Reason for recommendation",
            "relevance_score": 95
        }}
    ],
    "alternative_recommendations": [
        {{
            "title": "Resource title",
            "url": "Exact Tavily URL",
            "format": "visual",
            "reason": "Useful alternative",
            "relevance_score": 90
        }}
    ]
}}

IMPORTANT:

-1. Select preferred-format resources first.
2. If fewer than 3 suitable preferred-format resources exist,
   select suitable resources from other formats.
3. Never put a preferred-format resource in the alternatives array.
4. Return up to 3 resources in total.
5. Do not return empty arrays if suitable resources exist.
6. Only use resources from the supplied list.

RESOURCES:

{resource_text}
"""

# ============================================================
# VALIDATE GROQ RECOMMENDATIONS
# ============================================================
def validate_recommendations(
    recommendations: list[dict],
    original_resources: list[dict],
    preferred_format: str | None,
) -> list[dict]:

    # Normalize preferred format when provided.
    if preferred_format is not None:
        preferred_format = normalize_format(preferred_format)

    # Format aliases.
    format_aliases = {
        "visual": "visual",
        "video": "visual",
        "videos": "visual",
        "visual learning": "visual",
        "video tutorial": "visual",
        "video tutorials": "visual",

        "interactive": "interactive",
        "interactive learning": "interactive",
        "practice": "interactive",
        "hands-on": "interactive",
        "hands on": "interactive",
        "coding exercises": "interactive",

        "text": "text",
        "text-based": "text",
        "written": "text",
        "article": "text",
        "articles": "text",
        "documentation": "text",
        "reading": "text",
        "written tutorial": "text",
    }

    # Normalize URLs for comparison.
    def normalize_url(url):
        url = clean_text(url)

        if not url:
            return ""

        return url.rstrip("/")

    # Build set of URLs actually returned by Tavily.
    valid_urls = {
        normalize_url(resource.get("url"))
        for resource in original_resources
        if isinstance(resource, dict)
        and resource.get("url")
    }

    validated = []
    used_urls = set()

    if not isinstance(recommendations, list):
        print("Invalid recommendations list.")
        return []

    if not isinstance(original_resources, list):
        print("Invalid original resources list.")
        return []

    for index, recommendation in enumerate(
        recommendations,
        start=1,
    ):

        print(f"\nChecking resource {index}...")

        # 1. Check dictionary.
        if not isinstance(recommendation, dict):
            print("Rejected: Invalid resource structure.")
            continue

        # 2. Extract fields.
        title = clean_text(recommendation.get("title"))
        url = clean_text(recommendation.get("url"))
        reason = clean_text(recommendation.get("reason"))

        raw_format = clean_text(
            recommendation.get("format")
        ).lower()

        raw_score = recommendation.get("relevance_score")

        # 3. Check required fields.
        if not title:
            print("Rejected: Missing title.")
            continue

        if not url:
            print("Rejected: Missing URL.")
            continue

        if not reason:
            print("Rejected: Missing reason.")
            continue

        # 4. Check URL against Tavily results.
        normalized_url = normalize_url(url)

        if normalized_url not in valid_urls:
            print("Rejected: URL not found in Tavily results.")
            print("URL:", url)
            continue

        # 5. Check duplicate URLs.
        if normalized_url in used_urls:
            print("Rejected: Duplicate URL.")
            continue

        # 6. Normalize resource format.
        resource_format = format_aliases.get(raw_format)

        if resource_format is None:
            print("Rejected: Unsupported format:", raw_format)
            continue

        # 7. Check preferred format when required.
        if (
            preferred_format is not None
            and resource_format != preferred_format
        ):
            print("Rejected: Preferred format mismatch.")
            print("Received:", resource_format)
            print("Expected:", preferred_format)
            continue

        # 8. Validate relevance score.
        try:
            if isinstance(raw_score, bool):
                raise ValueError("Boolean is not a valid score.")

            score = float(raw_score)

            if not score.is_integer():
                raise ValueError("Score must be a whole number.")

            score = int(score)

        except (TypeError, ValueError):
            print("Rejected: Invalid relevance score.")
            continue

        if not 0 <= score <= 100:
            print("Rejected: Score outside 0-100.")
            continue

        # 9. Find the original Tavily resource.
        original_resource = next(
            (
                resource
                for resource in original_resources
                if isinstance(resource, dict)
                and normalize_url(resource.get("url"))
                == normalized_url
            ),
            None,
        )

        if original_resource is None:
            print("Rejected: Original resource not found.")
            continue

        # 10. Accept valid resource.
        validated.append({
            "title": title,
            "url": original_resource["url"],
            "format": resource_format,
            "reason": reason,
            "relevance_score": score,
        })

        used_urls.add(normalized_url)

        print("Accepted:", title)

    # 11. Sort by relevance score.
    validated.sort(
        key=lambda item: item["relevance_score"],
        reverse=True,
    )

    print("\n========== VALIDATION SUMMARY ==========")
    print("Preferred format:", preferred_format or "Any format")
    print("Received:", len(recommendations))
    print("Accepted:", len(validated))
    print("========================================")

    return validated
# ============================================================
# MAIN RESOURCE PIPELINE
# ============================================================

async def rank_resources(
    topic: str,
    level: str,
    preferred_format: str,
    goal: str,
    resources: list[dict],
) -> dict:

    preferred_format = normalize_format(preferred_format)

    if not resources:
        return {
            "preferred_recommendations": [],
            "alternative_recommendations": [],
        }
    print("\n========== RESOURCES RECEIVED BY GROQ ==========")

    for index, resource in enumerate(resources, start=1):
        print(f"\nResource {index}:")
        print("Title:", resource.get("title"))
        print("URL:", resource.get("url"))
        print("Description:", resource.get("description"))

    print("\n========== END OF RESOURCES ==========")
    prompt = build_groq_prompt(
        topic=topic,
        level=level,
        preferred_format=preferred_format,
        goal=goal,
        resources=resources,
    )

    print("\nCalling Groq for resource ranking...")

    client = Groq()

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an educational resource ranking "
                    "system. Return only valid JSON. "
                    "Never invent or modify URLs."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    raw_text = response.choices[0].message.content
    print("\n========== RAW GROQ RESPONSE ==========")
    print(raw_text)
    print("=======================================")        

    if not raw_text:
        raise RuntimeError("Groq returned an empty response.")

    data = json.loads(raw_text)

    if not isinstance(data, dict):
        raise ValueError("Groq returned an invalid JSON object.")

    preferred = data.get("preferred_recommendations", [])
    alternatives = data.get("alternative_recommendations", [])

    if not isinstance(preferred, list):
        preferred = []

    if not isinstance(alternatives, list):
        alternatives = []

    print("\nGroq ranking completed.")
    print("Preferred resources:", len(preferred))
    print("Alternative resources:", len(alternatives))

    return {
        "preferred_recommendations": preferred,
        "alternative_recommendations": alternatives,
    }
async def get_recommended_resources(
    topic: str,
    level: str,
    preferred_format: str,
    goal: str,
) -> dict:

    topic = clean_text(topic)
    goal = clean_text(goal)
    level = normalize_level(level)
    preferred_format = normalize_format(preferred_format)

    if not topic:
        raise ValueError("Topic cannot be empty.")

    if not goal:
        raise ValueError("Goal cannot be empty.")

    # STEP 1 — Tavily: Fetch mixed-format resources
    resources = await search_real_resources(
        topic=topic,
        level=level,
        preferred_format=preferred_format,
        goal=goal,
    )

    # STEP 2 — Groq: Rank preferred and alternative resources
    ranked = await rank_resources(
        topic=topic,
        level=level,
        preferred_format=preferred_format,
        goal=goal,
        resources=resources,
    )

    print("\n========== RESOURCE DEBUG ==========")
    print("Tavily resources:", len(resources))

    print(
        "Groq preferred:",
        len(ranked.get("preferred_recommendations", []))
    )

    print(
        "Groq alternatives:",
        len(ranked.get("alternative_recommendations", []))
    )

    # STEP 3 — Validate preferred resources
    preferred = validate_recommendations(
        recommendations=ranked.get(
            "preferred_recommendations", []
        ),
        original_resources=resources,
        preferred_format=preferred_format,
    )

    # STEP 4 — Validate alternative resources
    alternatives = validate_recommendations(
        recommendations=ranked.get(
            "alternative_recommendations", []
        ),
        original_resources=resources,
        preferred_format=None,
    )

    # Do not show the preferred format again as an alternative.
    alternatives = [
        resource
        for resource in alternatives
        if resource["format"] != preferred_format
    ]

    # STEP 5 — Select preferred resources first
    MAX_RECOMMENDATIONS = 3

    preferred = preferred[:MAX_RECOMMENDATIONS]

    remaining_slots = MAX_RECOMMENDATIONS - len(preferred)

    alternatives = alternatives[:remaining_slots]

    # STEP 6 — Final result
    result = {
        "preferred_format": preferred_format,
        "preferred_recommendations": preferred,
        "alternative_recommendations": alternatives,
        "total_resources": len(preferred) + len(alternatives),
    }

    print("\n========== FINAL EDUMATCH RESULTS ==========")
    print("Preferred resources:", len(preferred))
    print("Alternative resources:", len(alternatives))
    print("Total resources:", result["total_resources"])
    print("============================================")

    return result
if __name__ == "__main__":
    import asyncio

    async def test():
        print("=" * 70)
        print("RESOURCE SERVICE TEST STARTED")
        print("=" * 70)

        topic = "Python"
        level = "beginner"
        preferred_format = "visual"
        goal = "learn Python for AI"

        try:
            resources = await get_recommended_resources(
                topic=topic,
                level=level,
                preferred_format=preferred_format,
                goal=goal
            )

            print("\nFINAL RESULTS:")

            for index, resource in enumerate(
                resources,
                start=1
            ):
                print(f"\n{index}. {resource['title']}")
                print(f"Format: {resource['format']}")
                print(f"Score: {resource['relevance_score']}")
                print(f"URL: {resource['url']}")
                print(f"Why: {resource['reason']}")

        except Exception as exc:
            print("\nERROR:")
            print(type(exc).__name__)
            print(str(exc))

    asyncio.run(test())
