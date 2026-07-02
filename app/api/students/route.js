export async function GET(request) {
  return Response.json({ students: [] });
}
export async function POST(request) {
  return Response.json({ message: "Student created" });
}
