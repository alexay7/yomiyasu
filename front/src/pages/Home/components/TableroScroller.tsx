import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {useGlobal} from "../../../contexts/GlobalContext";
import {useSettingsStore} from "../../../stores/SettingsStore";

function TableroScroller():React.ReactElement {
    const {reloaded} = useGlobal();
    const {siteSettings} = useSettingsStore();

    const {data:tableroData, refetch:tableroRefetch} = useQuery(["tablero", siteSettings.mainView], async()=> {
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
    });

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await tableroRefetch();
        }

        if (reloaded && reloaded !== "reviews") {
            setTimeout(()=>{
                void refetchBooks();
            }, 1000);
        }
    }, [tableroRefetch, reloaded]);

    if (!tableroData || tableroData.length === 0) return <></>;

    return (
        <ComponentScroller type="books" title="Tu tablero" components={tableroData} deck/>
    );
}

export default TableroScroller;