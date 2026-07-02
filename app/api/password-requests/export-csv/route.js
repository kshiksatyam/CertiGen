export async function GET(request) {
  return new Response("email,status\n", {
    headers: { 'Content-Type': 'text/csv' }
  });
}
