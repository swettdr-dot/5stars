"use client";
import { useState } from "react";
import { submitReview } from "@/app/r/actions";

type Question = { id: string; text: string; type: "TEXT" | "MULTIPLE_CHOICE"; options: string[] };
type Props = {
  businessId: string;
  sellerId: string | null;
  name: string;
  logoUrl: string | null;
  questions: Question[];
};

export function ReviewFlow({ businessId, sellerId, name, logoUrl, questions }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const total = questions.length + 1;
  const onStars = questions.length;
  const isLow = stars > 0 && stars < 5;

  async function finish() {
    await submitReview({
      businessId, sellerId, starRating: stars,
      answers: questions.map((q) => ({ questionId: q.id, value: answers[q.id] ?? "" })),
      comment, contactName, contactPhone,
    });
  }

  return (
    <main className="mx-auto max-w-md p-6">
      {logoUrl && <img src={logoUrl} alt={name} className="mx-auto mb-4 h-16" />}
      <h1 className="mb-6 text-center text-xl font-bold">{name}</h1>

      {step < questions.length && (
        <div className="space-y-4">
          <p className="font-medium">{questions[step].text}</p>
          {questions[step].type === "TEXT" ? (
            <textarea className="w-full rounded border p-2"
              value={answers[questions[step].id] ?? ""}
              onChange={(e) => setAnswers({ ...answers, [questions[step].id]: e.target.value })} />
          ) : (
            <div className="space-y-2">
              {questions[step].options.map((o) => (
                <button key={o} type="button"
                  onClick={() => { setAnswers({ ...answers, [questions[step].id]: o }); setStep(step + 1); }}
                  className="block w-full rounded border p-2 text-left hover:bg-gray-50">{o}</button>
              ))}
            </div>
          )}
          <button onClick={() => setStep(step + 1)} className="w-full rounded bg-black p-2 text-white">Siguiente</button>
        </div>
      )}

      {step === onStars && (
        <div className="space-y-4 text-center">
          <p className="font-medium">¿Cómo calificarías tu experiencia?</p>
          <div className="flex justify-center gap-2 text-4xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setStars(n)}
                className={n <= stars ? "text-yellow-400" : "text-gray-300"}>★</button>
            ))}
          </div>
          {stars >= 5 && (
            <button onClick={finish} className="w-full rounded bg-black p-2 text-white">Enviar</button>
          )}
          {isLow && (
            <div className="space-y-3 text-left">
              <p className="text-sm text-gray-600">Lamentamos no haber cumplido tus expectativas. ¿Qué podemos mejorar?</p>
              <textarea placeholder="Tu comentario" className="w-full rounded border p-2"
                value={comment} onChange={(e) => setComment(e.target.value)} />
              <input placeholder="Tu nombre (opcional)" className="w-full rounded border p-2"
                value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <input placeholder="Teléfono (opcional)" className="w-full rounded border p-2"
                value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              <button onClick={finish} className="w-full rounded bg-black p-2 text-white">Enviar</button>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-gray-400">Paso {Math.min(step + 1, total)} de {total}</p>
    </main>
  );
}
