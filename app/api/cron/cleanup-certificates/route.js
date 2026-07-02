export async function GET(request) {
  return Response.json({ message: "Cron cleanup run completed" });
}
