import React, {lazy, Suspense} from "react";
import {LazySection} from "../../components/LazySection/LazySection";
import {ScrollerSkeleton} from "../../components/Skeletons/Skeletons";
import {useTitle} from "../../lib/useTitle";
import {useSettingsStore} from "../../stores/SettingsStore";

const NewBooksScroller = lazy(() => import("./components/NewBooksScroller"));
const ProgressScroller = lazy(() => import("./components/ProgressScroller"));
const TableroScroller = lazy(() => import("./components/TableroScroller"));
const ReadLaterScroller = lazy(() => import("./components/ReadLaterScroller"));
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
                    <ProgressScroller/>
                    <TableroScroller/>
                </Suspense>

                {showManga && (
                    <LazySection>
                        <Section title={'"Leer más tarde" manga'}>
                            <ReadLaterScroller variant="manga"/>
                        </Section>
                    </LazySection>
                )}
                {showNovels && (
                    <LazySection>
                        <Section title={'"Leer más tarde" novelas'}>
                            <ReadLaterScroller variant="novela"/>
                        </Section>
                    </LazySection>
                )}
                {showManga && (
                    <LazySection>
                        <Section title="Mangas nuevos">
                            <NewBooksScroller variant="manga"/>
                        </Section>
                    </LazySection>
                )}
                {showNovels && (
                    <LazySection>
                        <Section title="Novelas nuevas">
                            <NewBooksScroller variant="novela"/>
                        </Section>
                    </LazySection>
                )}
                {showManga && (
                    <LazySection>
                        <Section title="Series de manga nuevas">
                            <NewSeriesScroller variant="manga"/>
                        </Section>
                    </LazySection>
                )}
                {showNovels && (
                    <LazySection>
                        <Section title="Series de novelas nuevas">
                            <NewSeriesScroller variant="novela"/>
                        </Section>
                    </LazySection>
                )}
                {showManga && (
                    <LazySection>
                        <Section title="Series de manga con volúmenes nuevos">
                            <RecentSeriesScroller variant="manga"/>
                        </Section>
                    </LazySection>
                )}
                {showNovels && (
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
