export async function POST(request, { params }) {
  const { uid } = params;
  return Response.json({ message: `WhatsApp sent for ${uid}` });
}
