import {Skeleton} from "../../../ui/Skeleton";

interface LibraryGridSkeletonProps {
  count: number;
}

export function LibraryGridSkeleton({count}:LibraryGridSkeletonProps):React.ReactElement {
  return (
    <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-5 p-6 lg:p-8" aria-hidden>
      {Array.from({length:count}, (_, index)=>(
        <div key={index} className="flex w-full flex-col">
          <Skeleton className="aspect-[9/13] w-full rounded-t-lg" />
          <div className="flex flex-col gap-1.5 rounded-b-lg border border-t-0 border-app-border bg-app-surface px-2.5 pb-2 pt-2.5">
            <Skeleton variant="text" className="w-4/5" />
            <Skeleton variant="text" className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
