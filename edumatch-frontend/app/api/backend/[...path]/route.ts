import { NextRequest, NextResponse } from "next/server";

const backendUrl =
  process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const accessTokenCookie = "edumatch_access_token";
const tokenLifetimeSeconds = 60 * 60;

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;

 const target =
  backendUrl.replace(/\/$/, "") +
  "/" +
  path.join("/") +
  request.nextUrl.search;

  // Read JWT from the HttpOnly cookie
  const token = request.cookies.get(accessTokenCookie)?.value;

  console.log("PROXY REQUEST:", path.join("/"));
  console.log("AUTH COOKIE RECEIVED:", Boolean(token));

  const headers = new Headers();

  const contentType = request.headers.get("content-type");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  // Forward JWT to FastAPI
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const response = await fetch(target, init);
    const body = await response.text();

    const responseHeaders = new Headers();
    const responseContentType = response.headers.get("content-type");

    if (responseContentType) {
      responseHeaders.set("Content-Type", responseContentType);
    }

    // Handle successful signup and login
    if (
      response.ok &&
      path[0] === "auth" &&
      (path[1] === "signup" || path[1] === "login")
    ) {
      let authData: Record<string, unknown>;

      try {
        authData = JSON.parse(body) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { detail: "Invalid authentication response from backend." },
          { status: 502 }
        );
      }

      if (
        typeof authData.access_token !== "string" ||
        !authData.access_token
      ) {
        return NextResponse.json(
          { detail: "Backend did not issue an authentication token." },
          { status: 502 }
        );
      }

      // Do not expose JWT to frontend JavaScript
      const clientData = { ...authData };
      delete clientData.access_token;

      const authResponse = NextResponse.json(clientData, {
        status: response.status,
        headers: responseHeaders,
      });

      // Store JWT in HttpOnly cookie
      authResponse.cookies.set(
        accessTokenCookie,
        authData.access_token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/api/backend",
          maxAge: tokenLifetimeSeconds,
        }
      );

      return authResponse;
    }

    const proxiedResponse = new NextResponse(body, {
      status: response.status,
      headers: responseHeaders,
    });

    // Clear cookie if FastAPI rejects authentication
    if (response.status === 401) {
      proxiedResponse.cookies.set(accessTokenCookie, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/backend",
        maxAge: 0,
      });
    }

    return proxiedResponse;

  } catch (error) {
    console.error("Backend proxy error:", error);

    return NextResponse.json(
      {
        detail: "Backend is unavailable. Start FastAPI on port 8000.",
      },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;