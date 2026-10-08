import asyncio
import sys

from app.resource_service import (
    get_recommended_resources
)


async def main():
    reconfigure = getattr(sys.stdout, "reconfigure", None)
    if callable(reconfigure):
        reconfigure(errors="backslashreplace")

    print()
    print("=" * 60)
    print("EDUMATCH RESOURCE SERVICE TEST")
    print("=" * 60)

    # Change these values to test ANY topic.
    topic = "Java"

    level = "beginner"

    preferred_format = "Interactive"

    goal = "learn Java for AI projects"

    print()
    print("Student profile:")
    print(f"Topic            : {topic}")
    print(f"Level            : {level}")
    print(
        f"Preferred format : "
        f"{preferred_format}"
    )
    print(f"Goal             : {goal}")

    print()
    print("Running recommendation pipeline...")
    print()

    try:

        resources = (
            await get_recommended_resources(
                topic=topic,
                level=level,
                preferred_format=preferred_format,
                goal=goal
            )
        )

        print()
        print("=" * 60)
        print("TOP RECOMMENDED RESOURCES")
        print("=" * 60)

        for index, resource in enumerate(
            resources,
            start=1
        ):

            print()
            print(
                f"{index}. "
                f"{resource['title']}"
            )

            print(
                f"URL: "
                f"{resource['url']}"
            )

            print(
                f"Score: "
                f"{resource['relevance_score']}/100"
            )

            print(
                f"Why: "
                f"{resource['reason']}"
            )

    except Exception as exc:
        import traceback

        print()
        print("=" * 60)
        print("RESOURCE RECOMMENDATION FAILED")
        print("=" * 60)

        print(
            f"{type(exc).__name__}: {exc}"
        )

        print()
        print("FULL TRACEBACK:")
        traceback.print_exc()


if __name__ == "__main__":

    asyncio.run(
        main()
    )