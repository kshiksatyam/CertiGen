export async function DELETE(request, { params }) {
  const { rollNumber } = params;
  return Response.json({ message: `Student ${rollNumber} deleted` });
}
