import { z } from "zod";

const schema = z.object({
  text: z.string().trim().min(1, "Escribe el texto de la pregunta."),
  type: z.enum(["TEXT", "MULTIPLE_CHOICE"]),
  // En "Texto abierto" el campo no se renderiza → FormData.get devuelve null.
  options: z.string().nullish(),
});

export type ParsedQuestion = {
  text: string;
  type: "TEXT" | "MULTIPLE_CHOICE";
  options: string[];
};

export type ParseResult = { ok: true; data: ParsedQuestion } | { ok: false; error: string };

/** Pure: valida y normaliza la entrada del formulario de pregunta (alta o edición). */
export function parseQuestionInput(raw: {
  text: FormDataEntryValue | null;
  type: FormDataEntryValue | null;
  options: FormDataEntryValue | null;
}): ParseResult {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }
  const d = parsed.data;
  const options =
    d.type === "MULTIPLE_CHOICE" && d.options
      ? d.options.split(/\r?\n/).map((o) => o.trim()).filter(Boolean)
      : [];
  if (d.type === "MULTIPLE_CHOICE" && options.length === 0) {
    return { ok: false, error: "Agrega al menos una opción (una por línea)." };
  }
  return { ok: true, data: { text: d.text, type: d.type, options } };
}
