import React from "react";
import {Helmet} from "react-helmet";
import loadable from "@loadable/component";
import {useSettingsStore} from "../../stores/SettingsStore";
import {LazySection} from "../../components/LazySection/LazySection";

const NewBooksScroller = loadable(() => import("./components/NewBooksScroller"));
const ProgressScroller = loadable(() => import("./components/ProgressScroller"));
const TableroScroller = loadable(() => import("./components/TableroScroller"));
const ReadLaterScroller = loadable(() => import("./components/ReadLaterScroller"));
const NewSeriesScroller = loadable(() => import("./components/NewSeriesScroller"));
const RecentSeriesScroller = loadable(() => import("./components/RecentSeriesScroller"));

function Home():React.ReactElement {
    const {siteSettings} = useSettingsStore();

    return (
        <div className="dark:bg-app-bg bg-white overflow-y-scroll h-[calc(100svh-4rem)]">
            <Helmet>
                <title>YomiYasu</title>
            </Helmet>
            <div className="dark:text-white px-8 py-4 flex flex-col gap-4">
                <ProgressScroller/>
                <TableroScroller/>
                {["both", "manga"].includes(siteSettings.mainView) && (
                    <LazySection>
                        <ReadLaterScroller variant="manga"/>
                    </LazySection>
                )}
                {["both", "novels"].includes(siteSettings.mainView) && (
                    <LazySection>
                        <ReadLaterScroller variant="novela"/>
                    </LazySection>
                )}
                {["both", "manga"].includes(siteSettings.mainView) && (
                    <LazySection>
                        <NewBooksScroller variant="manga"/>
                    </LazySection>
                )}
                {["both", "novels"].includes(siteSettings.mainView) && (
                    <LazySection>
                        <NewBooksScroller variant="novela"/>
                    </LazySection>
                )}
                {["both", "manga"].includes(siteSettings.mainView) && (
                    <LazySection>
                        <NewSeriesScroller variant="manga"/>
                    </LazySection>
                )}
                {["both", "novels"].includes(siteSettings.mainView) && (
                    <LazySection>
                        <NewSeriesScroller variant="novela"/>
                    </LazySection>
                )}
                {["both", "manga"].includes(siteSettings.mainView) && (
                    <LazySection>
                        <RecentSeriesScroller variant="manga"/>
                    </LazySection>
                )}
                {["both", "novels"].includes(siteSettings.mainView) && (
                    <LazySection>
                        <RecentSeriesScroller variant="novela"/>
                    </LazySection>
                )}
            </div>
        </div>
    );
}

export default Home;

