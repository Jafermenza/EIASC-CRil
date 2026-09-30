import { NextResponse } from 'next/server';

const apiInternalUrl = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { token } = await params;
  const upstream = await fetch(
    `${apiInternalUrl}/api/v1/credentials/verify/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store',
    },
  });
}
