export async function GET(request, { params }) {
  const { uid } = params;
  return new Response(Buffer.from([]), {
    headers: { 'Content-Type': 'application/pdf' }
  });
}
