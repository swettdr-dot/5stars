"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, type AppUser } from "@/lib/session";
import { marketingBusinessWhere } from "@/lib/marketing/context";
import { brandKitSchema, resolveBrandKit } from "@/lib/marketing/brand-kit";
import { z } from "zod";
import { renderPostPng } from "@/lib/marketing/render";
import { uploadPostImage, blobKey, deletePostImages } from "@/lib/marketing/storage";
import { isTemplateKey } from "@/lib/marketing/templates";
import type { PostFormat } from "@/lib/marketing/formats";
import type { Prisma } from "@prisma/client";

export type BrandKitState = {
  ok: boolean;
  message?: string;
  error?: string;
};

/** Verifica que el usuario puede operar sobre `businessId`; devuelve el usuario y el negocio o lanza. */
async function assertBusiness(
  businessId: string,
): Promise<{ user: AppUser; business: { id: string; name: string; logoUrl: string | null } }> {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" && user.role !== "AGENCY_ADMIN") {
    throw new Error("FORBIDDEN");
  }
  const business = await prisma.business.findFirst({
    where: marketingBusinessWhere(user, businessId),
    select: { id: true, name: true, logoUrl: true },
  });
  if (!business) throw new Error("FORBIDDEN");
  return { user, business };
}

export async function saveBrandKit(
  _prev: BrandKitState,
  formData: FormData,
): Promise<BrandKitState> {
  let businessId: string;
  try {
    const { business } = await assertBusiness(String(formData.get("businessId") ?? ""));
    businessId = business.id;
  } catch {
    return { ok: false, error: "No tenés permisos para este negocio." };
  }

  const parsed = brandKitSchema.safeParse({
    primary: formData.get("primary"),
    accent: formData.get("accent"),
    background: formData.get("background"),
    text: formData.get("text"),
    colors: formData.getAll("colors").map(String).filter(Boolean),
    headingFont: formData.get("headingFont"),
    bodyFont: formData.get("bodyFont"),
    backgrounds: formData.getAll("backgrounds").map(String).filter(Boolean),
    toneOfVoice: (formData.get("toneOfVoice") as string) || null,
    logoOverrideUrl: (formData.get("logoOverrideUrl") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: "Revisá los colores y campos del kit." };
  }
  const d = parsed.data;

  const data = {
    primary: d.primary,
    accent: d.accent,
    background: d.background,
    text: d.text,
    colors: d.colors,
    headingFont: d.headingFont,
    bodyFont: d.bodyFont,
    backgrounds: d.backgrounds,
    toneOfVoice: d.toneOfVoice ?? null,
    logoOverrideUrl: d.logoOverrideUrl ?? null,
  };

  await prisma.brandKit.upsert({
    where: { businessId },
    create: { businessId, ...data },
    update: data,
  });

  revalidatePath("/marketing/brand-kit");
  return { ok: true, message: "Kit de marca guardado." };
}

const createPostSchema = z.object({
  businessId: z.string().min(1),
  reviewId: z.string().optional().nullable(),
  templateKey: z.string().refine(isTemplateKey, "Plantilla inválida."),
  quoteText: z.string().trim().min(1, "El texto no puede estar vacío.").max(280),
  starRating: z.coerce.number().int().min(1).max(5),
  attribution: z.string().trim().max(80).optional().nullable(),
  formats: z.array(z.enum(["SQUARE", "STORY"])).min(1),
});

export type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

export async function createPost(raw: unknown): Promise<CreatePostResult> {
  const parsed = createPostSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const input = parsed.data;

  let user: AppUser;
  let business: { id: string; name: string; logoUrl: string | null };
  try {
    ({ user, business } = await assertBusiness(input.businessId));
  } catch {
    return { ok: false, error: "No tenés permisos para este negocio." };
  }
  const businessId = business.id;

  const kitRow = await prisma.brandKit.findUnique({ where: { businessId } });
  const kit = resolveBrandKit(kitRow, business.logoUrl);

  // Fila primero (necesitamos el id para la clave de Blob), luego se rellenan URLs.
  const post = await prisma.marketingPost.create({
    data: {
      businessId,
      reviewId: input.reviewId ?? null,
      templateKey: input.templateKey,
      quoteText: input.quoteText,
      starRating: input.starRating,
      attribution: input.attribution ?? null,
      createdById: user.id,
    },
  });

  const urls: Partial<Record<PostFormat, string>> = {};
  try {
    for (const format of input.formats as PostFormat[]) {
      const png = await renderPostPng({
        templateKey: input.templateKey as Parameters<typeof renderPostPng>[0]["templateKey"],
        format,
        quote: input.quoteText,
        rating: input.starRating,
        attribution: input.attribution ?? null,
        businessName: business.name,
        kit,
      });
      urls[format] = await uploadPostImage(blobKey(businessId, post.id, format), png);
    }
    await prisma.marketingPost.update({
      where: { id: post.id },
      data: {
        imageSquareUrl: urls.SQUARE ?? null,
        imageStoryUrl: urls.STORY ?? null,
      },
    });
  } catch {
    // Limpieza: sin imágenes la fila no sirve; borrar fila y blobs ya subidos.
    await prisma.marketingPost.delete({ where: { id: post.id } }).catch(() => {});
    await deletePostImages(Object.values(urls)).catch(() => {});
    return { ok: false, error: "No se pudo generar la imagen. Intentá de nuevo." };
  }

  revalidatePath("/marketing");
  return { ok: true, postId: post.id };
}

export async function deletePost(postId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  // Acota el borrado al alcance del rol vía relación business.
  const post = await prisma.marketingPost.findFirst({
    where: { id: postId, business: marketingBusinessWhere(user) as Prisma.BusinessWhereInput },
    select: { id: true, imageSquareUrl: true, imageStoryUrl: true },
  });
  if (!post) return { ok: false };
  await prisma.marketingPost.delete({ where: { id: post.id } });
  const urls = [post.imageSquareUrl, post.imageStoryUrl].filter((u): u is string => Boolean(u));
  await deletePostImages(urls).catch(() => {});
  revalidatePath("/marketing");
  return { ok: true };
}
