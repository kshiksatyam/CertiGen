export async function GET(request, { params }) {
  const { rollNo } = params;
  return Response.json({ certificates: [] });
}
