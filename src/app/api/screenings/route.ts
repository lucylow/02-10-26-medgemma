export async function POST(_request: unknown) {
  // This is a lightweight placeholder that simply documents the intended contract.
  // The production implementation lives in the FastAPI backend and Supabase functions.
  return new Response(
    JSON.stringify({
      message: "POST /api/screenings is implemented in the backend service, not this placeholder route.",
    }),
    {
      status: 501,
      headers: { "Content-Type": "application/json" },
    },
  );
}

