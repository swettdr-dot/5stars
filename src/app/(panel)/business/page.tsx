import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { aggregateMetrics } from "@/lib/metrics";

export default async function BusinessDashboard() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;
  const reviews = await prisma.review.findMany({
    where: { businessId: user.businessId },
    include: { seller: true, answers: { include: { question: true } } },
    orderBy: { createdAt: "desc" },
  });
  const m = aggregateMetrics(reviews);
  const bySeller = new Map<string, { name: string; count: number }>();
  for (const r of reviews) {
    const key = r.seller?.name ?? "Sin vendedor";
    const cur = bySeller.get(key) ?? { name: key, count: 0 };
    cur.count++; bySeller.set(key, cur);
  }
  const internal = reviews.filter((r) => r.outcome === "INTERNAL");
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Panel del negocio</h1>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total reviews" value={m.total} />
        <Stat label="Promedio" value={m.average} />
        <Stat label="Redirigidos a Google" value={m.redirected} />
        <Stat label="Internas (<5)" value={internal.length} />
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Distribución</h2>
        <ul className="text-sm">
          {[5, 4, 3, 2, 1].map((n) => (
            <li key={n}>{n}★ — {m.distribution[n as 1 | 2 | 3 | 4 | 5]}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Por vendedor</h2>
        <ul className="text-sm">
          {[...bySeller.values()].map((s) => <li key={s.name}>{s.name} — {s.count}</li>)}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Reviews internas</h2>
        <ul className="space-y-2">
          {internal.map((r) => (
            <li key={r.id} className="rounded border p-3 text-sm">
              <div>{r.starRating}★ — {r.seller?.name ?? "Sin vendedor"}</div>
              {r.comment && <div className="text-gray-700">“{r.comment}”</div>}
              {(r.contactName || r.contactPhone) && (
                <div className="text-gray-500">{r.contactName} {r.contactPhone}</div>
              )}
              <ul className="mt-1 text-gray-500">
                {r.answers.map((a) => <li key={a.id}>{a.question.text}: {a.value}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
