import React from "react";
import {useQuery} from "@tanstack/react-query";
import {ArchiveRestore} from "lucide-react";
import {BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {SectionError, ScrollerSkeleton} from "../../../components/Skeletons/Skeletons";
import {keys} from "../../../lib/queryKeys";

interface NewBooksScrollerProps {
    variant:"manga" | "novela";
}

function NewBooksScroller({variant}:NewBooksScrollerProps):React.ReactElement {
    const {data:recentBooks, refetch:recentRefetch, isLoading, isError} = useQuery({
        queryKey:keys.recentBooks(variant),
        queryFn:async()=> {
            return api.get<BookWithProgress[]>(`books/${variant}?sort=!_id&limit=15`);
        }
    });

    const title = variant === "manga" ? "Mangas nuevos" : "Novelas nuevas";

    if (isLoading) return <ScrollerSkeleton title={title}/>;

    if (isError) {
        return <SectionError message="No se pudieron cargar los libros nuevos" onRetry={()=>{
            void recentRefetch();
        }}/>;
    }

    if (!recentBooks || recentBooks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="flex size-20 items-center justify-center rounded-full bg-tint text-primary">
                    <ArchiveRestore className="size-10" strokeWidth={1.25} />
                </span>
                <p className="mt-3 text-xl font-semibold text-fg">Esta biblioteca está vacía...</p>
            </div>
        );
    }

    return (
        <ComponentScroller type="books" title={title} components={recentBooks} noVariantIndicator
            moreLink={`/app/library/${variant === "manga" ? "manga" : "novels"}?sortBy=!_id`}
        />
    );
}

export default NewBooksScroller;
