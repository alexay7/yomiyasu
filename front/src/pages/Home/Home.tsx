import React from "react";
import {Helmet} from "react-helmet";
import loadable from "@loadable/component";

const NewBooksScroller = loadable(() => import("./components/NewBooksScroller"));
const ProgressScroller = loadable(() => import("./components/ProgressScroller"));
const TableroScroller = loadable(() => import("./components/TableroScroller"));
const ReadLaterScroller = loadable(() => import("./components/ReadLaterScroller"));
const NewSeriesScroller = loadable(() => import("./components/NewSeriesScroller"));
const RecentSeriesScroller = loadable(() => import("./components/RecentSeriesScroller"));

function Home():React.ReactElement {
    return (
        <div className="dark:bg-[#121212] bg-white overflow-x-hidden">
            <Helmet>
                <title>YomiYasu</title>
            </Helmet>
            <div className="dark:text-white px-8 py-4 flex flex-col gap-4">
                <ProgressScroller/>
                <TableroScroller/>
                <ReadLaterScroller/>
                <NewBooksScroller/>
                <NewSeriesScroller/>
                <RecentSeriesScroller/>
            </div>
        </div>
    );
}

export default Home;