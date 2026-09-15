import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {Link} from "react-router-dom";
import {MenuBook} from "@mui/icons-material";
import {Button} from "@mui/material";
import {BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {SectionError, ScrollerSkeleton} from "../../../components/Skeletons/Skeletons";
import {useGlobal} from "../../../contexts/GlobalContext";
import {useSettingsStore} from "../../../stores/SettingsStore";

function ProgressScroller():React.ReactElement {
    const {reloaded} = useGlobal();
    const {siteSettings} = useSettingsStore();

    const {data:progresoData = [], refetch:progressRefetch, isLoading, isError} = useQuery(["progreso", siteSettings.mainView], async()=> {
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
    });

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await Promise.all([
                progressRefetch()
            ]);
        }

        if (reloaded && reloaded !== "reviews") {
            setTimeout(()=>{
                void refetchBooks();
            }, 1000);
        }
    }, [progressRefetch, reloaded]);

    if (isLoading) return <ScrollerSkeleton title="En progreso"/>;

    if (isError) {
        return <SectionError message="No se pudieron cargar tus lecturas en progreso" onRetry={()=>{
            void progressRefetch();
        }}/>;
    }

    if (progresoData.length === 0) {
        const libraryLink = siteSettings.mainView === "novels" ? "/app/library/novels" : "/app/library/manga";

        return (
            <div>
                <h2>En progreso</h2>
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <MenuBook className="w-16 h-16" color="primary"/>
                    <p className="text-xl dark:text-white">Todavía no has empezado ninguna serie</p>
                    <Link to={libraryLink}>
                        <Button variant="contained">Explorar la biblioteca</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <ComponentScroller type="books" title="En progreso" components={progresoData}/>
    );
}

export default ProgressScroller;