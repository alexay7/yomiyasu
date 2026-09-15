import React from "react";
import {useQuery} from "@tanstack/react-query";
import {BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {SectionError, ScrollerSkeleton} from "../../../components/Skeletons/Skeletons";
import {useSettingsStore} from "../../../stores/SettingsStore";
import {keys} from "../../../lib/queryKeys";

function TableroScroller():React.ReactElement {
    const {siteSettings} = useSettingsStore();

    const {data:tableroData, refetch:tableroRefetch, isLoading, isError} = useQuery({
        queryKey:keys.tablero(siteSettings.mainView),
        queryFn:async()=> {
            const res = await api.get<BookWithProgress[]>("readprogress/tablero");

            if (!res) return [];

            switch (siteSettings.mainView) {
                case "manga":{
                    return res.filter((serie)=> serie.variant === "manga");
                }
                case "novels":{
                    return res.filter((serie)=> serie.variant === "novela");
                }
                default:{
                    return res;
                }
            }
        }
    });

    if (isLoading) return <ScrollerSkeleton title="Tu tablero"/>;

    if (isError) {
        return <SectionError message="No se pudo cargar tu tablero" onRetry={()=>{
            void tableroRefetch();
        }}/>;
    }

    if (!tableroData || tableroData.length === 0) return <></>;

    return (
        <ComponentScroller type="books" title="Tu tablero" components={tableroData} deck/>
    );
}

export default TableroScroller;
