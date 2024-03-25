import React from "react";
import {Helmet} from "react-helmet";
import loadable from "@loadable/component";
import {useSettingsStore} from "../../stores/SettingsStore";

const NewBooksScroller = loadable(() => import("./components/NewBooksScroller"));
const ProgressScroller = loadable(() => import("./components/ProgressScroller"));
const TableroScroller = loadable(() => import("./components/TableroScroller"));
const ReadLaterScroller = loadable(() => import("./components/ReadLaterScroller"));
const NewSeriesScroller = loadable(() => import("./components/NewSeriesScroller"));
const RecentSeriesScroller = loadable(() => import("./components/RecentSeriesScroller"));

function Home():React.ReactElement {
    const {siteSettings} = useSettingsStore();

    return (
        <div className="dark:bg-[#121212] bg-white overflow-y-scroll h-[calc(100svh-4rem)]"
            onDragOver={(e)=>{
                e.preventDefault();
            }}
            onDragEnter={(e)=>{
                e.preventDefault();
            }}
            onDragEnd={(e)=>{
                e.preventDefault();
            }}
            onDrop={(e)=>{
                e.preventDefault();
            }}
        >
            <Helmet>
                <title>YomiYasu</title>
            </Helmet>
            <div className="dark:text-white px-8 py-4 flex flex-col gap-4">
                <ProgressScroller/>
                <TableroScroller/>
                {["both", "manga"].includes(siteSettings.mainView) && (
                    <ReadLaterScroller variant="manga"/>
                )}
                {["both", "novels"].includes(siteSettings.mainView) && (
                    <ReadLaterScroller variant="novela"/>
                )}
                {["both", "manga"].includes(siteSettings.mainView) && (
                    <NewBooksScroller variant="manga"/>
                )}
                {["both", "novels"].includes(siteSettings.mainView) && (
                    <NewBooksScroller variant="novela"/>
                )}
                {["both", "manga"].includes(siteSettings.mainView) && (
                    <NewSeriesScroller variant="manga"/>
                )}
                {["both", "novels"].includes(siteSettings.mainView) && (
                    <NewSeriesScroller variant="novela"/>
                )}
                {["both", "manga"].includes(siteSettings.mainView) && (
                    <RecentSeriesScroller variant="manga"/>
                )}
                {["both", "novels"].includes(siteSettings.mainView) && (
                    <RecentSeriesScroller variant="novela"/>
                )}
            </div>
        </div>
    );
}

export default Home;

