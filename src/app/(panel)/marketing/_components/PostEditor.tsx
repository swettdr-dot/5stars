"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { createPost } from "../actions";
import { TEMPLATE_LIST, type TemplateKey } from "@/lib/marketing/templates";
import { ALL_FORMATS, FORMAT_LABEL, type PostFormat } from "@/lib/marketing/formats";

export function PostEditor({
  businessId,
  initial,
}: {
  businessId: string;
  initial: { reviewId: string | null; quoteText: string; starRating: number; attribution: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [templateKey, setTemplateKey] = useState<TemplateKey>("elegante");
  const [previewFormat, setPreviewFormat] = useState<PostFormat>("SQUARE");
  const [quoteText, setQuoteText] = useState(initial.quoteText);
  const [attribution, setAttribution] = useState(initial.attribution);
  const [formats, setFormats] = useState<PostFormat[]>(["SQUARE"]);

  const previewUrl =
    `/marketing/preview?businessId=${encodeURIComponent(businessId)}` +
    `&templateKey=${templateKey}&format=${previewFormat}` +
    `&rating=${initial.starRating}&quote=${encodeURIComponent(quoteText)}` +
    `&attribution=${encodeURIComponent(attribution)}`;

  function toggleFormat(f: PostFormat) {
    setFormats((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const res = await createPost({
        businessId,
        reviewId: initial.reviewId,
        templateKey,
        quoteText,
        starRating: initial.starRating,
        attribution,
        formats,
      });
      if (res.ok) router.push("/marketing");
      else setError(res.error);
    });
  }

  return (
    <div className="grid grid-cols-[1fr_360px] gap-6 max-lg:grid-cols-1">
      <div className="space-y-[14px]">
        {error && (
          <div role="alert" className="rounded-control border border-red/30 bg-red-bg px-4 py-2.5 text-body font-medium text-red">
            {error}
          </div>
        )}

        <Card padding="p-5">
          <div className="mb-3 text-card-title font-semibold text-ink">Plantilla</div>
          <div className="flex gap-2">
            {TEMPLATE_LIST.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTemplateKey(t.key)}
                className={`rounded-control border px-4 py-2 text-body font-medium transition-colors ${
                  templateKey === t.key ? "border-accent bg-accent-weak text-accent-dark" : "border-line text-ink-2 hover:border-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Card>

        <Card padding="p-5">
          <label className="mb-2 block text-card-title font-semibold text-ink">Texto de la reseña</label>
          <textarea
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
            rows={4}
            maxLength={280}
            className="w-full resize-none rounded-control border border-line bg-card p-3 text-body text-ink outline-none focus:border-accent"
          />
          <input
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            placeholder="Atribución (ej. — Ana, clienta)"
            className="mt-2.5 h-11 w-full rounded-control border border-line bg-card px-3 text-body text-ink outline-none focus:border-accent"
          />
        </Card>

        <Card padding="p-5">
          <div className="mb-3 text-card-title font-semibold text-ink">Formatos a generar</div>
          <div className="flex gap-4">
            {ALL_FORMATS.map((f) => (
              <label key={f} className="flex items-center gap-2 text-body text-ink-2">
                <input type="checkbox" checked={formats.includes(f)} onChange={() => toggleFormat(f)} />
                {FORMAT_LABEL[f]}
              </label>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCreate}
            disabled={pending || formats.length === 0 || !quoteText.trim()}
            className="h-10 rounded-control bg-accent px-[18px] text-body font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {pending ? "Generando…" : "Generar y guardar"}
          </button>
        </div>
      </div>

      <Card padding="p-4">
        <div className="mb-3 flex gap-2">
          {ALL_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPreviewFormat(f)}
              className={`rounded-pill border px-3 py-1 text-meta transition-colors ${
                previewFormat === f ? "border-accent bg-accent font-semibold text-white" : "border-line text-ink-2"
              }`}
            >
              {FORMAT_LABEL[f]}
            </button>
          ))}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={previewUrl}
          src={previewUrl}
          alt="Vista previa"
          className="w-full rounded-control border border-line"
        />
      </Card>
    </div>
  );
}
