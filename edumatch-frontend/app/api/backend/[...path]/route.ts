import { NextRequest, NextResponse } from 'next/server'

const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000'

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const target = `${backendUrl.replace(/\/$/, '')}/${path.join('/')}`
  const init: RequestInit = {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('content-type') ?? 'application/json',
    },
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text()
  }

  try {
    const response = await fetch(target, init)
    const body = await response.text()

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch {
    return NextResponse.json(
      { detail: 'Backend is unavailable. Start the FastAPI server on port 8000.' },
      { status: 503 },
    )
  }
}

export const GET = proxy
export const POST = proxy
