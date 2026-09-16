import React, {lazy, Suspense} from "react";
import {LazySection} from "../../components/LazySection/LazySection";
import {ScrollerSkeleton} from "../../components/Skeletons/Skeletons";
import {useTitle} from "../../lib/useTitle";
import {useSettingsStore} from "../../stores/SettingsStore";

const NewBooksScroller = lazy(() => import("./components/NewBooksScroller"));
const ProgressScroller = lazy(() => import("./components/ProgressScroller"));
const TableroScroller = lazy(() => import("./components/TableroScroller"));
const ReadLaterScroller = lazy(() => import("./components/ReadLaterScroller"));
const PausedScroller = lazy(() => import("./components/PausedScroller"));
const NewSeriesScroller = lazy(() => import("./components/NewSeriesScroller"));
const RecentSeriesScroller = lazy(() => import("./components/RecentSeriesScroller"));

function Section({title, children}:{title:string; children:React.ReactNode}):React.ReactElement {
    return <Suspense fallback={<ScrollerSkeleton title={title}/>}>{children}</Suspense>;
}

function Home():React.ReactElement {
    const {siteSettings} = useSettingsStore();

    useTitle("Inicio");

    const showManga = ["both", "manga"].includes(siteSettings.mainView);
    const showNovels = ["both", "novels"].includes(siteSettings.mainView);

    return (
        <div className="min-h-full bg-white dark:bg-app-bg">
            <div className="flex flex-col gap-4 px-4 py-4 dark:text-white lg:px-8">
                <Suspense fallback={<ScrollerSkeleton title="En progreso"/>}>
                    {siteSettings.showBoardProgress ? <ProgressScroller/> : null}
                    {siteSettings.showBoardTablero ? <TableroScroller/> : null}
                </Suspense>

                {showManga && siteSettings.showBoardReadLater && (
                    <LazySection>
                        <Section title={'"Leer más tarde" manga'}>
                            <ReadLaterScroller variant="manga"/>
                        </Section>
                    </LazySection>
                )}
                {showNovels && siteSettings.showBoardReadLater && (
                    <LazySection>
                        <Section title={'"Leer más tarde" novelas'}>
                            <ReadLaterScroller variant="novela"/>
                        </Section>
                    </LazySection>
                )}
                {showManga && siteSettings.showBoardPaused && (
                    <LazySection>
                        <Section title="Pausadas (manga)">
                            <PausedScroller variant="manga"/>
                        </Section>
                    </LazySection>
                )}
                {showNovels && siteSettings.showBoardPaused && (
                    <LazySection>
                        <Section title="Pausadas (novela)">
                            <PausedScroller variant="novela"/>
                        </Section>
                    </LazySection>
                )}
                {showManga && siteSettings.showBoardNewBooks && (
                    <LazySection>
                        <Section title="Mangas nuevos">
                            <NewBooksScroller variant="manga"/>
                        </Section>
                    </LazySection>
                )}
                {showNovels && siteSettings.showBoardNewBooks && (
                    <LazySection>
                        <Section title="Novelas nuevas">
                            <NewBooksScroller variant="novela"/>
                        </Section>
                    </LazySection>
                )}
                {showManga && siteSettings.showBoardNewSeries && (
                    <LazySection>
                        <Section title="Series de manga nuevas">
                            <NewSeriesScroller variant="manga"/>
                        </Section>
                    </LazySection>
                )}
                {showNovels && siteSettings.showBoardNewSeries && (
                    <LazySection>
                        <Section title="Series de novelas nuevas">
                            <NewSeriesScroller variant="novela"/>
                        </Section>
                    </LazySection>
                )}
                {showManga && siteSettings.showBoardRecentSeries && (
                    <LazySection>
                        <Section title="Series de manga con volúmenes nuevos">
                            <RecentSeriesScroller variant="manga"/>
                        </Section>
                    </LazySection>
                )}
                {showNovels && siteSettings.showBoardRecentSeries && (
                    <LazySection>
                        <Section title="Series de novelas con volúmenes nuevos">
                            <RecentSeriesScroller variant="novela"/>
                        </Section>
                    </LazySection>
                )}
            </div>
        </div>
    );
}

export default Home;
