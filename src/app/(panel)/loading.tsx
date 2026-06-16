import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

/** Skeleton genérico del panel mientras carga cualquier ruta. */
export default function PanelLoading() {
  return (
    <div>
      {/* header */}
      <div className="mb-5">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {/* KPIs */}
      <div className="mb-[14px] grid grid-cols-2 gap-grid sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} padding="px-4 pb-3.5 pt-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-3 h-3 w-20" />
          </Card>
        ))}
      </div>

      {/* dos bloques grandes */}
      <div className="grid grid-cols-1 gap-grid lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <Skeleton className="h-4 w-40" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </Card>
        <Card>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mx-auto mt-6 size-40 rounded-full" />
        </Card>
      </div>
    </div>
  );
}
