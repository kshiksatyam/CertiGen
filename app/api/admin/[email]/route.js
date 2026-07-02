export async function GET(request, { params }) {
  const { email } = params;
  return Response.json({ admin: { email } });
}
