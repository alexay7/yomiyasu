import {Skeleton} from "../../ui/Skeleton";

/** Fallback de Suspense que preserva el shell mientras carga una página. */
export function RouteFallback():React.ReactElement {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8" aria-busy="true" aria-label="Cargando página">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-4">
        {Array.from({length:12}, (_, index)=>(
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="aspect-[9/13] w-full rounded-lg" />
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
