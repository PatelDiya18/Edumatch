import asyncio
import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from mcp import Client


# ============================================================
# 1. LOAD .ENV
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = PROJECT_ROOT / ".env"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE)

TAVILY_MCP_URL = os.getenv("TAVILY_MCP_URL")


# ============================================================
# 2. VALIDATE TAVILY URL
# ============================================================

def validate_tavily_url(url: str | None) -> str:

    if not url:
        raise RuntimeError(
            "TAVILY_MCP_URL is missing from the environment or .env file."
        )

    url = url.strip()

    parsed = urlparse(url)

    if parsed.scheme not in {"http", "https"}:
        raise RuntimeError(
            "TAVILY_MCP_URL must start with "
            "http:// or https://"
        )

    if not parsed.netloc:
        raise RuntimeError(
            "TAVILY_MCP_URL is invalid."
        )

    return url


def get_tavily_mcp_url() -> str:
    return validate_tavily_url(
        os.getenv("TAVILY_MCP_URL") or TAVILY_MCP_URL
    )


# ============================================================
# 3. GET AVAILABLE TAVILY TOOLS
# ============================================================

async def list_tavily_tools(client: Client):
    """
    Get all tools exposed by the Tavily MCP server.
    """

    result = await client.list_tools()

    return result.tools


# ============================================================
# 4. FIND SEARCH TOOL
# ============================================================

def find_search_tool(tools):
    """
    Find the Tavily tool responsible for web searching.

    We first check common Tavily search names.
    If those are not found, we look for 'search'
    in the tool name or description.
    """

    if not tools:
        raise RuntimeError(
            "Tavily MCP returned no tools."
        )

    # --------------------------------------------------------
    # First: common names
    # --------------------------------------------------------

    preferred_names = {
        "tavily_search",
        "tavily-search",
        "search",
        "web_search",
        "web-search"
    }

    for tool in tools:

        name = getattr(
            tool,
            "name",
            ""
        )

        if name.lower() in preferred_names:
            return tool

    # --------------------------------------------------------
    # Second: search in tool name
    # --------------------------------------------------------

    for tool in tools:

        name = getattr(
            tool,
            "name",
            ""
        )

        if "search" in name.lower():
            return tool

    # --------------------------------------------------------
    # Third: search in description
    # --------------------------------------------------------

    for tool in tools:

        description = getattr(
            tool,
            "description",
            ""
        )

        if (
            description
            and "search" in description.lower()
        ):
            return tool

    available = [
        getattr(
            tool,
            "name",
            "unknown"
        )
        for tool in tools
    ]

    raise RuntimeError(
        "Could not find Tavily search tool. "
        f"Available tools: {available}"
    )


# ============================================================
# 5. BUILD SEARCH ARGUMENTS
# ============================================================

def build_search_arguments(
    tool,
    query: str,
    max_results: int
):
    """
    Build arguments according to the search tool's
    input schema.
    """

    if not query.strip():
        raise ValueError(
            "Search query cannot be empty."
        )

    # MCP Python SDK uses inputSchema in some versions
    # and input_schema in others.
    schema = getattr(
        tool,
        "inputSchema",
        None
    )

    if schema is None:

        schema = getattr(
            tool,
            "input_schema",
            None
        )

    # --------------------------------------------------------
    # If schema isn't available, use standard Tavily format.
    # --------------------------------------------------------

    if not isinstance(schema, dict):

        return {
            "query": query,
            "max_results": max_results
        }

    properties = schema.get(
        "properties",
        {}
    )

    arguments = {}

    # --------------------------------------------------------
    # Query parameter
    # --------------------------------------------------------

    if "query" in properties:

        arguments["query"] = query

    elif "search_query" in properties:

        arguments["search_query"] = query

    else:

        # Standard Tavily MCP search uses query.
        arguments["query"] = query

    # --------------------------------------------------------
    # Result count
    # --------------------------------------------------------

    if "max_results" in properties:

        arguments["max_results"] = max_results

    elif "limit" in properties:

        arguments["limit"] = max_results

    return arguments


# ============================================================
# 6. SEARCH TAVILY
# ============================================================

async def search_tavily(
    query: str,
    max_results: int = 10
):
    """
    Execute one Tavily search through Remote MCP.
    """

    if not query.strip():
        raise ValueError(
            "Tavily search query cannot be empty."
        )

    max_results = min(
        max_results,
        20
    )

    print(
        f"[EduMatch] Tavily query: {query}"
    )

    try:
        mcp_url = get_tavily_mcp_url()

        async with Client(
            mcp_url
        ) as client:

            # ----------------------------------------------
            # Discover tools
            # ----------------------------------------------

            tools = await list_tavily_tools(
                client
            )

            print(
                "[EduMatch] Available tools:"
            )

            for tool in tools:

                print(
                    f"  - {tool.name}"
                )

            # ----------------------------------------------
            # Find search tool
            # ----------------------------------------------

            search_tool = find_search_tool(
                tools
            )

            print(
                f"[EduMatch] Search tool: "
                f"{search_tool.name}"
            )

            # ----------------------------------------------
            # Build arguments
            # ----------------------------------------------

            arguments = build_search_arguments(
                tool=search_tool,
                query=query,
                max_results=max_results
            )

            print(
                f"[EduMatch] Arguments: "
                f"{arguments}"
            )

            # ----------------------------------------------
            # Call Tavily
            # ----------------------------------------------

            result = await client.call_tool(
                search_tool.name,
                arguments
            )

            # ----------------------------------------------
            # Check structured response
            # ----------------------------------------------

            structured = getattr(
                result,
                "structured_content",
                None
            )

            if isinstance(
                structured,
                dict
            ):

                if structured.get(
                    "status"
                ) == 429:

                    raise RuntimeError(
                        "Tavily rate limit reached. "
                        "Check your Tavily API key "
                        "and usage limits."
                    )

                if structured.get(
                    "error"
                ):

                    raise RuntimeError(
                        "Tavily search failed: "
                        f"{structured.get('error')}"
                    )

            return result

    except RuntimeError:
        raise

    except Exception as exc:

        print("=" * 70)
        print("[EduMatch] TAVILY MCP EXCEPTION")
        print("=" * 70)

        print(
            f"Exception type: {type(exc).__name__}"
        )

        print(
            f"Exception message: {exc}"
        )

        print(
            f"Exception repr: {repr(exc)}"
        )

        # ExceptionGroup contains the actual underlying
        # MCP/network exception.
        if isinstance(exc, BaseExceptionGroup):

            print()
            print("ExceptionGroup details:")

            for index, sub_exception in enumerate(
                exc.exceptions,
                start=1
            ):

                print(
                    f"\n--- Sub-exception {index} ---"
                )

                print(
                    f"Type: "
                    f"{type(sub_exception).__name__}"
                )

                print(
                    f"Message: "
                    f"{sub_exception}"
                )

                print(
                    f"Repr: "
                    f"{repr(sub_exception)}"
                )

        print("=" * 70)

        raise

# ============================================================
# 7. PRINT TOOL INFORMATION
# ============================================================

async def show_tavily_tools():

    async with Client(
        get_tavily_mcp_url()
    ) as client:

        print(
            "\nConnected to Tavily MCP."
        )

        print(
            "\nAvailable tools:"
        )

        tools = await list_tavily_tools(
            client
        )

        if not tools:

            print(
                "No tools found."
            )

            return

        for tool in tools:

            print(
                "\n----------------------------"
            )

            print(
                f"NAME: {tool.name}"
            )

            print(
                f"DESCRIPTION: "
                f"{getattr(tool, 'description', '')}"
            )

            schema = getattr(
                tool,
                "inputSchema",
                None
            )

            if schema is None:

                schema = getattr(
                    tool,
                    "input_schema",
                    None
                )

            print(
                f"INPUT SCHEMA: {schema}"
            )


# ============================================================
# 8. TEST REAL SEARCH
# ============================================================

async def test_search():

    result = await search_tavily(
        query=(
            "Python beginner learning "
            "resources for AI"
        ),
        max_results=5
    )

    print(
        "\n======================================"
    )

    print(
        "TAVILY SEARCH RESULT"
    )

    print(
        "======================================"
    )

    structured = getattr(
        result,
        "structured_content",
        None
    )

    if structured:

        print(
            structured
        )

    else:

        content = getattr(
            result,
            "content",
            []
        )

        for item in content:

            text = getattr(
                item,
                "text",
                None
            )

            if text:
                print(text)


# ============================================================
# 9. MAIN
# ============================================================

if __name__ == "__main__":

    print(
        "\nEduMatch - Tavily MCP"
    )

    print(
        "1. Show available tools"
    )

    print(
        "2. Test real search"
    )

    choice = input(
        "\nEnter choice: "
    ).strip()

    if choice == "1":

        asyncio.run(
            show_tavily_tools()
        )

    elif choice == "2":

        asyncio.run(
            test_search()
        )

    else:

        print(
            "Invalid choice."
        )