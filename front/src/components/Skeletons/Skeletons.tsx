import {ErrorState} from "../../ui/ErrorState";
import {Skeleton} from "../../ui/Skeleton";

interface ScrollerSkeletonProps {
    title:string;
}

/** Esqueleto de una estantería horizontal del inicio. */
export function ScrollerSkeleton({title}:ScrollerSkeletonProps):React.ReactElement {
    return (
        <section className="flex flex-col" aria-hidden>
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-fg">{title}</h2>
                <div className="flex gap-1">
                    <Skeleton className="size-7 rounded-md" />
                    <Skeleton className="size-7 rounded-md" />
                </div>
            </div>
            <div className="flex gap-5 py-3">
                {Array.from({length:8}, (_, index)=>(
                    <div key={index} className="w-36 shrink-0">
                        <Skeleton className="aspect-[9/13] w-full rounded-t-lg" />
                        <div className="flex flex-col gap-1.5 rounded-b-lg border border-t-0 border-app-border bg-app-surface px-2.5 pb-2 pt-2.5">
                            <Skeleton variant="text" className="w-4/5" />
                            <Skeleton variant="text" className="h-3 w-2/5" />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

interface SectionErrorProps {
    message:string;
    onRetry?:()=>void;
}

/** Error de sección con reintento. */
export function SectionError({message, onRetry}:SectionErrorProps):React.ReactElement {
    return <ErrorState title={message} onRetry={onRetry} />;
}
