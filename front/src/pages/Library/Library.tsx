import {keepPreviousData, useQuery} from "@tanstack/react-query";
import {ArrowLeft, BookOpen, Dices, Images, RefreshCw, SearchX, X} from "lucide-react";
import React from "react";
import {useNavigate} from "react-router";
import {toast} from "react-toastify";
import {api} from "../../api/api";
import {CoverCard} from "../../components/CoverCard/CoverCard";
import {useAuth} from "../../contexts/AuthContext";
import {buildAlphabetQuery, buildSeriesQuery, useLibraryFilters} from "../../lib/useLibraryFilters";
import {keys} from "../../lib/queryKeys";
import {confirmDialog} from "../../stores/ConfirmStore";
import {useSettingsStore} from "../../stores/SettingsStore";
import type {Alphabet, SerieWithProgress, SeriesFilter} from "../../types/serie";
import {Button} from "../../ui/Button";
import {EmptyState} from "../../ui/EmptyState";
import {ErrorState} from "../../ui/ErrorState";
import {IconButton} from "../../ui/IconButton";
import {Pagination} from "../../ui/Pagination";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../ui/Select";
import {SegmentedControl} from "../../ui/SegmentedControl";
import {AlphabetStrip} from "./components/AlphabetStrip";
import {LibraryGridSkeleton} from "./components/LibraryGridSkeleton";
import {LibraryFiltersPopover} from "./components/LibraryFiltersPopover";
import {activeFilterCount, sortOptions} from "./components/libraryFilterUtils";

interface LibraryProps {
    variant: "manga" | "novela";
}

const statusLabels: Record<string, string> = {
    ENDED: "Finalizada",
    PUBLISHING: "En publicación",
};

const progressLabels: Record<string, string> = {
    completed: "Completadas",
    reading: "En progreso",
    unread: "Sin empezar",
};

function Library({variant}:LibraryProps):React.ReactElement {
    const navigate = useNavigate();
    const {userData} = useAuth();
    const {siteSettings, modifySiteSettings} = useSettingsStore();

    const defaultLimit = siteSettings.libraryLimit || window.localStorage.getItem("limit") || "25";
    const {filters, setFilter, setPage, clearFilters, hasActiveFilters, queryParams} = useLibraryFilters(defaultLimit);

    const seriesParams = buildSeriesQuery(filters, true);
    const seriesParamsString = seriesParams.toString();

    const {data:series = {pages:1, data:[]}, isLoading, isError, refetch} = useQuery({
        queryKey:keys.seriesList(variant, seriesParamsString),
        placeholderData:keepPreviousData,
        queryFn:async()=>{
            const res = await api.get<SeriesFilter>(`series/${variant}?${seriesParamsString}`);
            return res ?? {pages:1, data:[]};
        }
    });

    const alphabetParams = buildAlphabetQuery(filters);
    const alphabetParamsString = alphabetParams.toString();

    const {data:alphabet = []} = useQuery({
        queryKey:keys.seriesAlphabet(variant, alphabetParamsString),
        queryFn:async()=>{
            const res = await api.get<Alphabet[]>(`series/${variant}/alphabet?${alphabetParamsString}`);
            return res ?? [];
        }
    });

    const {data:genresAndArtists = {genres:[], authors:[]}} = useQuery({
        queryKey:keys.genresAndArtists,
        queryFn:async()=>{
            return (await api.get<{genres:string[], authors:string[]}>("series/genresAndArtists")) ?? {genres:[], authors:[]};
        }
    });

    async function rollDice():Promise<void> {
        const randomParams = buildSeriesQuery(filters, false);

        try {
            const serie = await api.get<SerieWithProgress>(`series/${variant}/random?${randomParams.toString()}`);

            if (!serie) {
                toast.error("Ninguna serie coincide con los filtros indicados");
                return;
            }

            navigate(`/app/series/${serie._id}`);
        } catch {
            toast.error("Ninguna serie coincide con los filtros indicados");
        }
    }

    async function rescanLibrary():Promise<void> {
        if (!await confirmDialog("¿Reescanear la biblioteca? Puede tardar un rato.")) return;

        try {
            await api.get(`rescan/${variant}`);
            toast.success("Reescaneo terminado");
        } catch {
            toast.error("No se pudo reescanear la biblioteca");
        }
    }

    const activeCount = activeFilterCount(filters);
    const chips: Array<{key:string; label:string; onRemove:()=>void}> = [];

    if (filters.letter !== "ALL") chips.push({key:"letter", label:`Letra: ${filters.letter}`, onRemove:()=>setFilter("letter", "ALL")});
    if (filters.genre) chips.push({key:"genre", label:filters.genre, onRemove:()=>setFilter("genre", null)});
    if (filters.author) chips.push({key:"author", label:filters.author, onRemove:()=>setFilter("author", null)});
    if (filters.status) chips.push({key:"status", label:statusLabels[filters.status] ?? filters.status, onRemove:()=>setFilter("status", null)});
    if (filters.readProgress !== "all") chips.push({key:"progress", label:progressLabels[filters.readProgress] ?? filters.readProgress, onRemove:()=>setFilter("readProgress", "all")});
    if (filters.readlist) chips.push({key:"readlist", label:"Leer más tarde", onRemove:()=>setFilter("readlist", false)});
    if (filters.min > 0 || filters.max < 10) chips.push({key:"difficulty", label:`Dificultad ${filters.min}–${filters.max}`, onRemove:()=>{
        setFilter("min", 0);
        setFilter("max", 10);
    }});

    return (
        <div className="flex min-h-full flex-col">
            <div className="sticky top-0 z-20 border-b border-app-border bg-app-sidebar">
                <div className="flex h-14 items-center gap-1.5 px-3">
                    <IconButton label="Volver atrás" onClick={()=>navigate(-1)}>
                        <ArrowLeft />
                    </IconButton>
                    {userData?.admin ? (
                        <IconButton label="Reescanear biblioteca" onClick={()=>void rescanLibrary()}>
                            <RefreshCw />
                        </IconButton>
                    ) : null}

                    {/* En pantallas pequeñas la biblioteca cambia de variante aquí */}
                    <SegmentedControl
                        className="ml-1 lg:hidden"
                        size="sm"
                        aria-label="Tipo de biblioteca"
                        value={variant}
                        onChange={(value)=>{
                            const path = value === "manga" ? "/app/library/manga" : "/app/library/novels";
                            const query = queryParams.toString();
                            navigate(query ? `${path}?${query}` : path);
                        }}
                        options={[
                            {value:"manga", icon:<Images />, label:<span className="hidden sm:inline">Mangas</span>},
                            {value:"novela", icon:<BookOpen />, label:<span className="hidden sm:inline">Novelas</span>},
                        ]}
                    />

                    <div className="ml-auto flex items-center gap-2">
                        <LibraryFiltersPopover
                            filters={filters}
                            setFilter={setFilter}
                            clearFilters={clearFilters}
                            genres={genresAndArtists.genres}
                            authors={genresAndArtists.authors}
                        />
                        <div className="hidden items-center gap-2 sm:flex">
                            <Select value={filters.sortBy} onValueChange={(v)=>setFilter("sortBy", v)}>
                                <SelectTrigger className="h-8 w-44 text-[13px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortOptions.map((option)=>(
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.limit}
                                onValueChange={(v)=>{
                                    setFilter("limit", v);
                                    modifySiteSettings("libraryLimit", v);
                                }}
                            >
                                <SelectTrigger className="h-8 w-[4.5rem] text-[13px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {["10", "25", "50", "100"].map((limit)=>(
                                        <SelectItem key={limit} value={limit}>{limit}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <IconButton label="Elegir serie al azar" variant="solid" size="sm" onClick={()=>void rollDice()} className="size-8">
                            <Dices />
                        </IconButton>
                    </div>
                </div>

                {chips.length > 0 ? (
                    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-3 pb-2">
                        {chips.map((chip)=>(
                            <button
                                key={chip.key}
                                type="button"
                                onClick={chip.onRemove}
                                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-xs font-medium text-fg transition-colors hover:bg-app-border"
                            >
                                {chip.label}
                                <X className="size-3 text-fg-muted" />
                            </button>
                        ))}
                        {activeCount > 0 ? (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="shrink-0 px-2 text-xs font-medium text-primary hover:underline"
                            >
                                Limpiar todo
                            </button>
                        ) : null}
                    </div>
                ) : null}

                <AlphabetStrip alphabet={alphabet} selected={filters.letter} onSelect={(letter)=>setFilter("letter", letter)} />
            </div>

            <div className="flex flex-1 flex-col">
                {isLoading ? <LibraryGridSkeleton count={Math.min(parseInt(filters.limit), 25)} /> : null}

                {isError ? (
                    <ErrorState
                        title="No se pudo cargar la biblioteca"
                        onRetry={()=>void refetch()}
                    />
                ) : null}

                {!isLoading && !isError && series.data.length === 0 ? (
                    <EmptyState
                        icon={SearchX}
                        title={hasActiveFilters ? "Sin resultados" : "Esta biblioteca está vacía"}
                        description={hasActiveFilters
                            ? "Ninguna serie coincide con los filtros seleccionados."
                            : "Añade series a tu biblioteca y aparecerán aquí."}
                    >
                        {hasActiveFilters ? (
                            <Button variant="secondary" size="sm" onClick={clearFilters}>Limpiar filtros</Button>
                        ) : null}
                    </EmptyState>
                ) : null}

                {!isLoading && !isError && series.data.length > 0 ? (
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-5 p-4 lg:p-6">
                        {series.data.map((serie)=>(
                            <li key={serie._id} className="[content-visibility:auto] [contain-intrinsic-size:auto_260px]">
                                <CoverCard kind="serie" serie={serie} noVariantIndicator />
                            </li>
                        ))}
                    </ul>
                ) : null}

                {series.pages > 1 ? (
                    <div className="sticky bottom-0 z-10 mt-auto flex items-center justify-center gap-4 border-t border-app-border bg-app-bg/95 py-2 backdrop-blur">
                        <Pagination page={filters.page} pages={series.pages} onPageChange={setPage} />
                        <p className="hidden text-xs text-fg-muted sm:block">Página {filters.page} de {series.pages}</p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default Library;
