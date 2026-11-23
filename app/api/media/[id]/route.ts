import { readMedia } from "@/lib/cms/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await readMedia(id);
  if (!media) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(media.base64, "base64"), {
    headers: {
      "Content-Type": media.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${media.filename.replace(/["\r\n]/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
