import React from "react";
import {useQuery} from "@tanstack/react-query";
import {useNavigate} from "react-router";
import {LibraryBig} from "lucide-react";
import {BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {SectionError, ScrollerSkeleton} from "../../../components/Skeletons/Skeletons";
import {useSettingsStore} from "../../../stores/SettingsStore";
import {keys} from "../../../lib/queryKeys";
import {Button} from "../../../ui/Button";

function ProgressScroller():React.ReactElement {
    const {siteSettings} = useSettingsStore();
    const navigate = useNavigate();

    const {data:progresoData = [], refetch:progressRefetch, isLoading, isError} = useQuery({
        queryKey:keys.reading(siteSettings.mainView),
        queryFn:async()=> {
            const res = await api.get<BookWithProgress[]>("readprogress/reading");

            if (!res) return [];

            switch (siteSettings.mainView) {
                case "manga":{
                    return res.filter((book)=> book.variant === "manga");
                }
                case "novels":{
                    return res.filter((book)=> book.variant === "novela");
                }
                default:{
                    return res;
                }
            }
        }
    });

    if (isLoading) return <ScrollerSkeleton title="En progreso"/>;

    if (isError) {
        return <SectionError message="No se pudieron cargar tus lecturas en progreso" onRetry={()=>{
            void progressRefetch();
        }}/>;
    }

    if (progresoData.length === 0) {
        const libraryLink = siteSettings.mainView === "novels" ? "/app/library/novels" : "/app/library/manga";

        return (
            <section className="flex flex-col gap-2">
                <h2 className="text-base font-semibold text-fg">En progreso</h2>
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                    <span className="flex size-14 items-center justify-center rounded-full bg-tint text-primary">
                        <LibraryBig className="size-7" strokeWidth={1.5} />
                    </span>
                    <p className="text-base font-semibold text-fg">Todavía no has empezado ninguna serie</p>
                    <Button onClick={()=>navigate(libraryLink)}>Explorar la biblioteca</Button>
                </div>
            </section>
        );
    }

    return (
        <ComponentScroller type="books" title="En progreso" components={progresoData}/>
    );
}

export default ProgressScroller;
