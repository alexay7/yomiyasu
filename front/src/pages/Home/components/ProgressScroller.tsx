import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {useGlobal} from "../../../contexts/GlobalContext";
import {useSettingsStore} from "../../../stores/SettingsStore";

function ProgressScroller():React.ReactElement {
    const {reloaded} = useGlobal();
    const {siteSettings} = useSettingsStore();

    const {data:progresoData = [], refetch:progressRefetch} = useQuery(["progreso", siteSettings.mainView], async()=> {
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

    if (!progresoData || progresoData.length === 0) return <></>;

    return (
        <ComponentScroller type="books" title="En progreso" components={progresoData}/>
    );
}

export default ProgressScroller;