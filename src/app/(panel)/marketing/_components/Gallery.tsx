"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { deletePost } from "../actions";

export type GalleryItem = {
  id: string;
  quoteText: string;
  imageSquareUrl: string | null;
  imageStoryUrl: string | null;
};

export function Gallery({ items, businessId }: { items: GalleryItem[]; businessId: string }) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <Card padding="p-8">
        <p className="text-center text-body text-ink-2">
          Aún no hay publicaciones.{" "}
          <Link href={`/marketing/new?businessId=${businessId}`} className="font-semibold text-accent">
            Crea la primera
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
      {items.map((it) => {
        const thumb = it.imageSquareUrl ?? it.imageStoryUrl;
        return (
          <Card key={it.id} padding="p-3">
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={it.quoteText} className="aspect-square w-full rounded-control border border-line object-cover" />
            )}
            <p className="mt-2 line-clamp-2 text-meta text-ink-2">{it.quoteText}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {it.imageSquareUrl && (
                <a href={it.imageSquareUrl} download className="rounded-control border border-line px-3 py-1 text-meta font-semibold text-ink-2 hover:border-accent hover:text-accent">
                  Feed
                </a>
              )}
              {it.imageStoryUrl && (
                <a href={it.imageStoryUrl} download className="rounded-control border border-line px-3 py-1 text-meta font-semibold text-ink-2 hover:border-accent hover:text-accent">
                  Story
                </a>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("¿Borrar esta publicación? No se puede deshacer.")) return;
                  startTransition(() => void deletePost(it.id));
                }}
                className="ml-auto rounded-control px-3 py-1 text-meta text-red hover:bg-red-bg disabled:opacity-60"
              >
                Borrar
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
