"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveManageableBusiness } from "@/lib/business-access";

/** Estado devuelto a la UI (useActionState) para mostrar feedback/validación. */
export type SettingsState = {
  ok: boolean;
  /** Mensaje de éxito (toast). */
  message?: string;
  /** Error general (no atado a un campo). */
  error?: string;
  /** Errores por campo, para resaltar el input correspondiente. */
  fieldErrors?: Partial<Record<"googleReviewUrl" | "logoUrl" | "starThreshold", string>>;
};

const schema = z.object({
  googleReviewUrl: z
    .string()
    .trim()
    .min(1, "Ingresa la URL de tu ficha de Google.")
    .url("Ingresa una URL válida."),
  // Acepta vacío, una URL http(s), o una imagen subida como data URL (base64).
  logoUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//i.test(v) || /^data:image\//i.test(v),
      "Sube una imagen o pega una URL válida.",
    )
    .refine((v) => !v || v.length <= 400_000, "La imagen es demasiado grande (máx ~250 KB)."),
  starThreshold: z.coerce
    .number()
    .int()
    .min(1, "El umbral debe estar entre 1 y 5.")
    .max(5, "El umbral debe estar entre 1 y 5."),
});

export async function updateSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const businessId = String(formData.get("businessId"));
  try {
    await resolveManageableBusiness(businessId);
  } catch {
    return { ok: false, error: "No tienes permisos para editar este negocio." };
  }

  const parsed = schema.safeParse({
    googleReviewUrl: formData.get("googleReviewUrl"),
    logoUrl: formData.get("logoUrl"),
    starThreshold: formData.get("starThreshold"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: {
        googleReviewUrl: flat.googleReviewUrl?.[0],
        logoUrl: flat.logoUrl?.[0],
        starThreshold: flat.starThreshold?.[0],
      },
    };
  }

  const data = parsed.data;
  await prisma.business.update({
    where: { id: businessId },
    data: {
      googleReviewUrl: data.googleReviewUrl,
      logoUrl: data.logoUrl ? data.logoUrl : null,
      starThreshold: data.starThreshold,
    },
  });

  revalidatePath(`/agency/${businessId}/settings`);
  revalidatePath("/business/settings");
  return { ok: true, message: "Cambios guardados." };
}
