import {Command} from "cmdk";
import {Search} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {api} from "../../api/api";
import {getFlameColor} from "../../helpers/series";
import {BookWithProgress} from "../../types/book";
import {SerieWithProgress, SeriesFilter} from "../../types/serie";
import {Kbd} from "../../ui/Kbd";
import {Rating} from "../../ui/Rating";
import {Spinner} from "../../ui/Spinner";
import {useNavigate} from "react-router";
import {useDebouncedValue} from "../../lib/useDebouncedValue";
import {useOpenBook} from "../../lib/useOpenBook";
import {bookThumbnail, serieThumbnail} from "../../lib/media";
import {CoverImage} from "../CoverImage";
import {cn} from "../../ui/cn";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SearchResult = {type:"serie", data:SerieWithProgress} | {type:"book", data:BookWithProgress};

export function GlobalSearch({open, onOpenChange}:GlobalSearchProps):React.ReactElement {
  const navigate = useNavigate();
  const openBook = useOpenBook();

  const [query, setQuery] = useState("");
  const [series, setSeries] = useState<SerieWithProgress[]>([]);
  const [books, setBooks] = useState<BookWithProgress[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 300);
  // El spinner aparece en cuanto se escribe, antes de que dispare el debounce
  const searching = loading || query.trim() !== debouncedQuery.trim();

  useEffect(()=>{
    const term = debouncedQuery.trim();

    if (term.length < 2) {
      setSeries([]);
      setBooks([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function getSeries():Promise<void> {
      const res = await api.get<SeriesFilter>(`series/all?name=${encodeURIComponent(term)}&sort=sortName`);

      if (!res || cancelled) return;

      res.data.sort((a, b)=>{
        if (a.variant === "manga" && b.variant === "novela") return -1;
        if (a.variant === "novela" && b.variant === "manga") return 1;
        return 0;
      });

      setSeries(res.data);
    }

    async function getBooks():Promise<void> {
      const res = await api.get<BookWithProgress[]>(`books/all?name=${encodeURIComponent(term)}&limit=10&page=1&sort=sortName`);

      if (!res || cancelled) return;

      res.sort((a, b)=>{
        if (a.variant === "manga" && b.variant === "novela") return -1;
        if (a.variant === "novela" && b.variant === "manga") return 1;
        return 0;
      });

      setBooks(res);
    }

    void Promise.all([getSeries(), getBooks()]).finally(()=>{
      if (!cancelled) setLoading(false);
    });

    return ()=>{
      cancelled = true;
    };
  }, [debouncedQuery]);

  const groups = useMemo(()=>{
    return {
      mangaSeries: series.filter((item)=>item.variant === "manga"),
      novelaSeries: series.filter((item)=>item.variant === "novela"),
      mangaBooks: books.filter((item)=>item.variant === "manga"),
      novelaBooks: books.filter((item)=>item.variant === "novela"),
    };
  }, [series, books]);

  async function selectResult(result:SearchResult, newTab = false):Promise<void> {
    if (result.type === "serie") {
      const path = `/app/series/${result.data._id}`;

      if (newTab) {
        window.open(path, "_blank")?.focus();
        return;
      }

      onOpenChange(false);
      navigate(path);
      return;
    }

    onOpenChange(false);
    await openBook(result.data, {mouse:newTab, confirmReread:true});
  }

  function getThumbnail(result:SearchResult):string {
    return result.type === "serie" ? serieThumbnail(result.data) : bookThumbnail(result.data);
  }

  function renderItem(result:SearchResult):React.ReactElement {
    return (
      <Command.Item
        key={`${result.type}-${result.data._id}`}
        value={`${result.type}-${result.data._id}`}
        onSelect={()=>void selectResult(result)}
        onMouseDown={(e)=>{
          if (e.button === 1) {
            e.preventDefault();
            void selectResult(result, true);
          }
        }}
        className={cn(
          "flex cursor-pointer select-none items-center gap-3 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors",
          "data-[selected=true]:bg-tint",
        )}
      >
        <CoverImage
          loading="lazy"
          decoding="async"
          width={36}
          height={48}
          src={getThumbnail(result)}
          alt=""
          className="h-12 w-9 shrink-0 rounded-sm object-cover"
        />
        <span className="min-w-0 flex-1 truncate font-medium text-fg">{result.data.visibleName}</span>
        {result.type === "serie" ? (
          <span className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
            <span>{result.data.bookCount} vols</span>
            {result.data.difficulty > 0 ? (
              <span className="inline-flex items-center gap-1" title={`Dificultad: ${result.data.difficulty.toFixed(1)}/10`}>
                <span className="inline-block size-2.5 rounded-full" style={{backgroundColor:getFlameColor(result.data.difficulty)}} />
                {result.data.difficulty.toFixed(1)}
              </span>
            ) : null}
            {result.data.valoration ? <Rating value={result.data.valoration / 2} /> : null}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-fg-muted">
            {result.data.variant === "manga" ? `${result.data.pages} págs` : `${result.data.characters ?? 0} caract.`}
          </span>
        )}
      </Command.Item>
    );
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(v)=>{
        onOpenChange(v);
        if (!v) setQuery("");
      }}
      label="Búsqueda global"
      shouldFilter={false}
      className={cn(
        "fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden",
        "rounded-xl border border-app-border bg-app-surface text-fg shadow-2xl",
      )}
    >
      <div className="flex items-center gap-2 border-b border-app-border px-3">
        <Search className="size-4 shrink-0 text-fg-muted" />
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Busca series o libros de la biblioteca…"
          className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
        />
        {searching ? <Spinner className="shrink-0 text-fg-muted" /> : <Kbd className="shrink-0">Esc</Kbd>}
      </div>

      <Command.List className="max-h-[55svh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-fg-muted">
          {query.trim().length < 2 ? "Escribe al menos 2 caracteres" : searching ? "Buscando…" : "Sin resultados"}
        </Command.Empty>

        {groups.mangaSeries.length > 0 ? (
          <Command.Group heading="Series de manga" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-muted/80">
            {groups.mangaSeries.map((data)=>renderItem({type:"serie", data}))}
          </Command.Group>
        ) : null}
        {groups.mangaBooks.length > 0 ? (
          <Command.Group heading="Mangas" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-muted/80">
            {groups.mangaBooks.map((data)=>renderItem({type:"book", data}))}
          </Command.Group>
        ) : null}
        {groups.novelaSeries.length > 0 ? (
          <Command.Group heading="Series de novelas" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-muted/80">
            {groups.novelaSeries.map((data)=>renderItem({type:"serie", data}))}
          </Command.Group>
        ) : null}
        {groups.novelaBooks.length > 0 ? (
          <Command.Group heading="Novelas" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-muted/80">
            {groups.novelaBooks.map((data)=>renderItem({type:"book", data}))}
          </Command.Group>
        ) : null}
      </Command.List>

      <div className="flex items-center justify-end gap-3 border-t border-app-border px-3 py-2 text-[11px] text-fg-muted">
        <span className="flex items-center gap-1"><Kbd>↵</Kbd> Abrir</span>
        <span className="flex items-center gap-1"><Kbd>Esc</Kbd> Cerrar</span>
      </div>
    </Command.Dialog>
  );
}
