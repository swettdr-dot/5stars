"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/app/r/actions";

export type FlowQuestion = {
  id: string;
  text: string;
  type: "TEXT" | "MULTIPLE_CHOICE";
  options: string[];
};

type Props = {
  name: string;
  logoUrl?: string | null;
  questions: FlowQuestion[];
  starThreshold: number;
  /** Contexto de envío (sólo modo live). */
  businessId?: string;
  sellerId?: string | null;
  /** Modo vista previa: paso controlado, sin envíos ni avance automático. */
  preview?: boolean;
  step?: number;
};

const RATING_LABELS = ["", "Muy malo 😞", "Malo 😕", "Regular 😐", "Bueno 🙂", "¡Excelente! 🤩"];

const STAR_PATH = "M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z";

export function ReviewFlow({
  name,
  logoUrl,
  questions,
  starThreshold,
  businessId,
  sellerId = null,
  preview = false,
  step: controlledStep,
}: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [terminal, setTerminal] = useState<null | "capture" | "high" | "low" | "thanks">(null);
  const [googleUrl, setGoogleUrl] = useState("");
  const [pending, startTransition] = useTransition();

  const total = questions.length + 1;
  const ratingStep = questions.length;
  const curStep = preview ? Math.min(Math.max(controlledStep ?? 0, 0), ratingStep) : step;
  const progress = !preview && terminal ? 100 : Math.round((curStep / total) * 100);

  function submit(extra: { comment?: string; contactName?: string; contactPhone?: string }, next: "high" | "thanks") {
    if (preview || !businessId) return;
    startTransition(async () => {
      const res = await submitReview({
        businessId,
        sellerId: sellerId ?? null,
        starRating: stars,
        answers: questions.map((q) => ({ questionId: q.id, value: answers[q.id] ?? "" })),
        comment: extra.comment ?? "",
        contactName: extra.contactName ?? "",
        contactPhone: extra.contactPhone ?? "",
      });
      setGoogleUrl(res.googleReviewUrl);
      setTerminal(next);
    });
  }

  function answerMC(q: FlowQuestion, option: string) {
    if (preview) return;
    setAnswers((a) => ({ ...a, [q.id]: option }));
    setStep((s) => s + 1);
  }

  function sendRating() {
    if (preview || stars === 0) return;
    if (stars >= starThreshold) setTerminal("capture");
    else setTerminal("low");
  }

  // ---- screen content ----
  let body: React.ReactNode;
  const q = curStep < questions.length ? questions[curStep] : null;

  if (!preview && terminal === "capture") {
    body = (
      <div className="flex flex-1 flex-col">
        <h2 className="text-[19px] font-semibold tracking-tight text-ink">¡Gracias! ¿Nos dejas tu reseña?</h2>
        <p className="mt-1 text-meta text-ink-2">La copiamos para que solo la pegues en Google.</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Cuéntanos tu experiencia…"
          className="mt-4 w-full resize-none rounded-control border border-line bg-card p-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
        />
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Tu nombre (opcional)"
          className="mt-2.5 h-11 w-full rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
        />
        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (comment.trim()) {
                navigator.clipboard?.writeText(comment).catch(() => {});
              }
              submit({ comment, contactName }, "high");
            }}
            className="w-full rounded-control bg-accent py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            Copiar e ir a Google
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit({}, "high")}
            className="w-full rounded-control border border-line bg-card py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            Ir directo a Google
          </button>
        </div>
      </div>
    );
  } else if (!preview && terminal === "high") {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <CheckMark color="var(--green)" />
        <StarsStatic value={5} />
        <h2 className="mt-4 text-[20px] font-semibold tracking-tight text-ink">¡Gracias por tu calificación!</h2>
        <p className="mt-1 text-meta text-ink-2">Ayudanos compartiéndola en Google.</p>
        <a
          href={googleUrl}
          className="mt-6 w-full rounded-control bg-accent py-3 text-center text-[15px] font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Calificar en Google
        </a>
      </div>
    );
  } else if (!preview && terminal === "low") {
    body = (
      <div className="flex flex-1 flex-col">
        <h2 className="text-[18px] font-semibold tracking-tight text-ink">Tu opinión es privada</h2>
        <p className="mt-1 text-meta text-ink-2">No se publica. La usamos para mejorar.</p>
        <label className="mt-4 mb-1 block text-meta font-medium text-ink-2">¿Qué podemos mejorar?</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-control border border-line bg-card p-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
        />
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Tu nombre (opcional)"
          className="mt-2.5 h-11 w-full rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
        />
        <input
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="Teléfono o email (opcional)"
          className="mt-2.5 h-11 w-full rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
        />
        <button
          type="button"
          onClick={() => submit({ comment, contactName, contactPhone }, "thanks")}
          disabled={pending}
          className="mt-5 w-full rounded-control bg-accent py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          Enviar
        </button>
      </div>
    );
  } else if (!preview && terminal === "thanks") {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <CheckMark color="var(--ac)" />
        <h2 className="mt-4 text-[20px] font-semibold tracking-tight text-ink">¡Gracias!</h2>
        <p className="mt-1 text-meta text-ink-2">Tu opinión nos ayuda a mejorar.</p>
      </div>
    );
  } else if (q) {
    body = (
      <div className="flex flex-1 flex-col">
        <p className="text-[10.5px] font-semibold uppercase tracking-label text-ink-3">
          Pregunta {curStep + 1} de {questions.length}
        </p>
        <h2 className="mt-1.5 text-[19px] font-semibold tracking-tight text-ink">{q.text}</h2>
        {q.type === "MULTIPLE_CHOICE" ? (
          <div className="mt-5 flex flex-col gap-2.5">
            {q.options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => answerMC(q, o)}
                className={`w-full rounded-control border border-line bg-card px-4 py-3 text-left text-body font-medium text-ink transition-colors ${
                  preview ? "" : "hover:border-accent hover:bg-accent-weak"
                } ${answers[q.id] === o ? "border-accent bg-accent-weak" : ""}`}
              >
                {o}
              </button>
            ))}
          </div>
        ) : (
          <>
            <textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => !preview && setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              rows={4}
              placeholder="Escribe tu respuesta (opcional)…"
              className="mt-5 w-full resize-none rounded-control border border-line bg-card p-3 text-body text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ac-bg)]"
            />
            <button
              type="button"
              onClick={() => !preview && setStep((s) => s + 1)}
              className="mt-auto w-full rounded-control bg-accent py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              Continuar
            </button>
          </>
        )}
      </div>
    );
  } else {
    // rating step
    const shown = hover || stars;
    body = (
      <div className="flex flex-1 flex-col items-center text-center">
        <h2 className="mt-2 text-[19px] font-semibold tracking-tight text-ink">¿Cómo calificarías tu experiencia?</h2>
        <div className="mt-6 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => !preview && setHover(n)}
              onMouseLeave={() => !preview && setHover(0)}
              onClick={() => !preview && setStars(n)}
              aria-label={`${n} estrellas`}
              className="transition-transform"
              style={{ transform: `scale(${n === shown && !preview ? 1.12 : 1})` }}
            >
              <svg width={46} height={46} viewBox="0 0 24 24" fill={n <= shown ? "var(--amber)" : "#E6E6EC"}>
                <path d={STAR_PATH} />
              </svg>
            </button>
          ))}
        </div>
        <p className="mt-4 h-6 text-[15px] font-semibold text-ink">{RATING_LABELS[shown] ?? ""}</p>
        <button
          type="button"
          onClick={sendRating}
          disabled={preview || stars === 0 || pending}
          className="mt-auto w-full rounded-control bg-accent py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar calificación
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-full flex-col bg-card">
      <div className="px-6 pb-4 pt-6">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent-bg text-[13px] font-semibold text-accent-dark">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="text-[15px] font-semibold text-ink">{name}</span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-7 pt-2">{body}</div>
    </div>
  );
}

function StarsStatic({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={22} height={22} viewBox="0 0 24 24" fill={n <= value ? "var(--amber)" : "#E6E6EC"} aria-hidden>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

function CheckMark({ color }: { color: string }) {
  return (
    <span
      className="flex size-16 items-center justify-center rounded-full animate-pop"
      style={{ background: `color-mix(in srgb, ${color} 14%, #fff)` }}
    >
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    </span>
  );
}
