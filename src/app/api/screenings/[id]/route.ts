interface RouteParams {
  params: { id: string };
}

export async function GET(_request: unknown, { params }: RouteParams) {
  return new Response(
    JSON.stringify({
      message: "GET /api/screenings/:id is implemented in the backend service, not this placeholder route.",
      id: params.id,
    }),
    {
      status: 501,
      headers: { "Content-Type": "application/json" },
    },
  );
}

