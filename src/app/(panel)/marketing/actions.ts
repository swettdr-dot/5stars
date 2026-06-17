"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { marketingBusinessWhere } from "@/lib/marketing/context";
import { brandKitSchema } from "@/lib/marketing/brand-kit";

export type BrandKitState = {
  ok: boolean;
  message?: string;
  error?: string;
};

/** Verifica que el usuario puede operar sobre `businessId`; devuelve el id o lanza. */
async function assertBusiness(businessId: string): Promise<string> {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" && user.role !== "AGENCY_ADMIN") {
    throw new Error("FORBIDDEN");
  }
  const b = await prisma.business.findFirst({
    where: marketingBusinessWhere(user, businessId),
    select: { id: true },
  });
  if (!b) throw new Error("FORBIDDEN");
  return b.id;
}

export async function saveBrandKit(
  _prev: BrandKitState,
  formData: FormData,
): Promise<BrandKitState> {
  let businessId: string;
  try {
    businessId = await assertBusiness(String(formData.get("businessId") ?? ""));
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
