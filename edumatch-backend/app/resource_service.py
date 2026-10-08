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

GROQ_MODEL = "openai/gpt-oss-20b"


# ============================================================
# GROQ CLIENT
# ============================================================

client = Groq()


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
        "video": "visual",
        "videos": "visual",
        "visual learning": "visual",
        "visuals": "visual",

        "interactive learning": "interactive",
        "practice": "interactive",
        "hands-on": "interactive",
        "hands on": "interactive",

        "written": "text",
        "article": "text",
        "articles": "text",
        "documentation": "text",
        "reading": "text",
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

    format_description = FORMAT_DEFINITIONS[
        preferred_format
    ]

    query = (
        f"{topic} {level} learning resources "
        f"for {goal}. "
        f"Preferred learning format: {preferred_format}. "
        f"Look for {format_description}"
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

    format_description = FORMAT_DEFINITIONS[
        preferred_format
    ]

    resource_text = ""

    for index, resource in enumerate(
        resources,
        start=1
    ):

        resource_text += (
            f"\nRESOURCE {index}\n"
            f"Title: {resource['title']}\n"
            f"URL: {resource['url']}\n"
            f"Description: {resource['description']}\n"
        )

    return f"""
You are the resource recommendation engine for EduMatch.

STUDENT PROFILE

Topic:
{topic}

Learning level:
{level}

Learning goal:
{goal}

Preferred format:
{preferred_format}

FORMAT DEFINITION:
{format_description}

YOUR TASK

Analyze the provided resources.

Return EXACTLY 3 resources.

ALL 3 resources MUST match the student's preferred format.

Do NOT return resources from another format.

Rank them from most relevant to least relevant.

Consider:

1. Topic relevance
2. Learning level suitability
3. Goal relevance
4. Preferred format match
5. Quality and usefulness
6. Whether the resource is genuinely educational

IMPORTANT:

- Use ONLY URLs provided in the resources.
- NEVER invent a URL.
- NEVER modify a URL.
- Do not return duplicate URLs.
- Do not recommend a resource merely because its title contains the topic.
- The resource must genuinely match the requested format.

FORMAT RULES

VISUAL:
Videos, video courses, animations, visual explanations,
diagram-based learning, demonstrations.

INTERACTIVE:
Coding practice, quizzes, exercises,
simulations, interactive lessons,
hands-on learning.

TEXT:
Documentation, articles, written tutorials,
guides, books, written courses.

OUTPUT FORMAT

Return ONLY valid JSON.

The JSON must have this structure:

{{
    "recommendations": [
        {{
            "title": "resource title",
            "url": "exact URL from input",
            "format": "{preferred_format}",
            "reason": "short explanation",
            "relevance_score": 95
        }}
    ]
}}

The relevance_score must be between 0 and 100.

RESOURCES

{resource_text}
"""


# ============================================================
# EXTRACT JSON FROM GROQ RESPONSE
# ============================================================

def extract_json(text: str) -> dict:

    text = text.strip()

    # Remove markdown code fences
    text = re.sub(
        r"^```(?:json)?",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"```$",
        "",
        text
    )

    text = text.strip()

    try:
        return json.loads(text)

    except json.JSONDecodeError:

        # Try extracting the first JSON object
        match = re.search(
            r"\{.*\}",
            text,
            flags=re.DOTALL
        )

        if not match:
            raise ValueError(
                "Groq did not return valid JSON."
            )

        try:
            return json.loads(
                match.group(0)
            )

        except json.JSONDecodeError as exc:

            raise ValueError(
                "Groq returned malformed JSON."
            ) from exc


# ============================================================
# CALL GROQ
# ============================================================

async def rank_resources(
    topic: str,
    level: str,
    preferred_format: str,
    goal: str,
    resources: list[dict],
) -> list[dict]:

    prompt = build_groq_prompt(
        topic=topic,
        level=level,
        preferred_format=preferred_format,
        goal=goal,
        resources=resources,
    )

    print("\nCalling Groq for resource ranking...")

    response = client.chat.completions.create(
        model=GROQ_MODEL,

        messages=[
            {
                "role": "system",
                "content": (
                    "You are a strict JSON-only "
                    "educational resource ranking system."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],

        temperature=0.1,

        response_format={
            "type": "json_object"
        },
    )

    raw_text = response.choices[0].message.content

    if not raw_text:
        raise RuntimeError(
            "Groq returned an empty response."
        )

    data = extract_json(raw_text)

    recommendations = data.get(
        "recommendations"
    )

    if not isinstance(
        recommendations,
        list
    ):
        raise ValueError(
            "Groq response does not contain "
            "a recommendations list."
        )

    return recommendations


# ============================================================
# VALIDATE GROQ RECOMMENDATIONS
# ============================================================

def validate_recommendations(
    recommendations: list[dict],
    original_resources: list[dict],
    preferred_format: str,
) -> list[dict]:

    preferred_format = normalize_format(
        preferred_format
    )

    # URLs that actually came from Tavily
    valid_urls = {
        resource["url"].strip()
        for resource in original_resources
        if resource.get("url")
    }

    validated = []

    used_urls = set()

    for recommendation in recommendations:

        if not isinstance(
            recommendation,
            dict
        ):
            continue

        title = clean_text(
            recommendation.get("title")
        )

        url = clean_text(
            recommendation.get("url")
        )

        reason = clean_text(
            recommendation.get("reason")
        )

        resource_format = clean_text(
            recommendation.get("format")
        ).lower()

        score = recommendation.get(
            "relevance_score"
        )
        if score is None:
            continue

        if not isinstance(
            score,
            (int, float, str),
        ):
            continue

        # ----------------------------------------------------
        # URL must originate from Tavily
        # ----------------------------------------------------

        if url not in valid_urls:
            print(
                f"Rejected hallucinated URL: {url}"
            )
            continue

        # ----------------------------------------------------
        # Prevent duplicates
        # ----------------------------------------------------

        if url in used_urls:
            continue

        # ----------------------------------------------------
        # Format must match
        # ----------------------------------------------------

        if resource_format != preferred_format:

            print(
                f"Rejected wrong-format resource: "
                f"{title}"
            )

            continue

        # ----------------------------------------------------
        # Validate score
        # ----------------------------------------------------

        try:

            score = int(score)

        except (
            TypeError,
            ValueError
        ):

            continue

        if not 0 <= score <= 100:
            continue

        if not title or not reason:
            continue

        validated.append(
            {
                "title": title,
                "url": url,
                "format": preferred_format,
                "reason": reason,
                "relevance_score": score,
            }
        )

        used_urls.add(url)

    # Sort highest score first
    validated.sort(
        key=lambda item: item[
            "relevance_score"
        ],
        reverse=True,
    )

    return validated[:MAX_RECOMMENDATIONS]


# ============================================================
# MAIN RESOURCE PIPELINE
# ============================================================

async def get_recommended_resources(
    topic: str,
    level: str,
    preferred_format: str,
    goal: str,
) -> list[dict]:

    topic = clean_text(topic)
    goal = clean_text(goal)

    level = normalize_level(level)

    preferred_format = normalize_format(
        preferred_format
    )

    if not topic:
        raise ValueError(
            "Topic cannot be empty."
        )

    if not goal:
        raise ValueError(
            "Goal cannot be empty."
        )

    # --------------------------------------------------------
    # STEP 1 — Tavily
    # --------------------------------------------------------

    resources = await search_real_resources(
        topic=topic,
        level=level,
        preferred_format=preferred_format,
        goal=goal,
    )

    # --------------------------------------------------------
    # STEP 2 — Groq
    # --------------------------------------------------------

    ranked = await rank_resources(
        topic=topic,
        level=level,
        preferred_format=preferred_format,
        goal=goal,
        resources=resources,
    )

    # --------------------------------------------------------
    # STEP 3 — Validation
    # --------------------------------------------------------

    recommendations = validate_recommendations(
        recommendations=ranked,
        original_resources=resources,
        preferred_format=preferred_format,
    )

    # --------------------------------------------------------
    # EXACTLY 3 REQUIRED
    # --------------------------------------------------------

    if len(recommendations) < 3:

        raise RuntimeError(
            f"Only {len(recommendations)} valid "
            f"{preferred_format} resources were found. "
            f"EduMatch requires 3."
        )

    print("\n" + "=" * 70)
    print("FINAL EDUMATCH RECOMMENDATIONS")
    print("=" * 70)

    for index, resource in enumerate(
        recommendations,
        start=1
    ):

        print(
            f"\n#{index} "
            f"{resource['title']}"
        )

        print(
            f"Format: "
            f"{resource['format']}"
        )

        print(
            f"Score: "
            f"{resource['relevance_score']}"
        )

        print(
            f"URL: "
            f"{resource['url']}"
        )

    print("=" * 70)

    return recommendations
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
