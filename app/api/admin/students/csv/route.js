export async function GET(request) {
  return new Response("rollNumber,name,email\n", {
    headers: { 'Content-Type': 'text/csv' }
  });
}
