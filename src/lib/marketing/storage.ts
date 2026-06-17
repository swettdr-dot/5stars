import { put } from "@vercel/blob";
import type { PostFormat } from "@/lib/marketing/formats";

export function blobKey(businessId: string, postId: string, format: PostFormat): string {
  return `marketing/${businessId}/${postId}-${format.toLowerCase()}.png`;
}

/** Sube el PNG a Vercel Blob (acceso público) y devuelve la URL. */
export async function uploadPostImage(key: string, bytes: Uint8Array): Promise<string> {
  const { url } = await put(key, Buffer.from(bytes), {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return url;
}
