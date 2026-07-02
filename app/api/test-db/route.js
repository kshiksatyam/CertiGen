export async function GET(request) {
  return Response.json({ status: "OK", database: "connected" });
}
