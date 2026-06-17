import { describe, it, expect } from "vitest";
import { parseQuestionInput } from "@/lib/question-input";

describe("parseQuestionInput", () => {
  it("acepta texto abierto e ignora opciones", () => {
    const r = parseQuestionInput({ text: " ¿Te atendieron bien? ", type: "TEXT", options: "x\ny" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.text).toBe("¿Te atendieron bien?");
      expect(r.data.type).toBe("TEXT");
      expect(r.data.options).toEqual([]);
    }
  });

  it("parsea opciones múltiples una por línea, recortando y filtrando vacíos", () => {
    const r = parseQuestionInput({ text: "Calidad", type: "MULTIPLE_CHOICE", options: " Buena \n\n Mala \r\nRegular" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.options).toEqual(["Buena", "Mala", "Regular"]);
  });

  it("rechaza texto vacío", () => {
    const r = parseQuestionInput({ text: "   ", type: "TEXT", options: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/texto/i);
  });

  it("rechaza opción múltiple sin opciones", () => {
    const r = parseQuestionInput({ text: "Calidad", type: "MULTIPLE_CHOICE", options: "  \n  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/opción/i);
  });
});
