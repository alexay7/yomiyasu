import {ChevronLeft, ChevronRight, Dices} from "lucide-react";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Link, useNavigate} from "react-router";
import type {BookWithProgress} from "../../types/book";
import type {SerieWithProgress} from "../../types/serie";
import {IconButton} from "../../ui/IconButton";
import {CoverCard} from "../CoverCard/CoverCard";
import {useOpenBook} from "../../lib/useOpenBook";

interface ComponentScrollerProps {
  title: string;
  components: BookWithProgress[] | SerieWithProgress[];
  type: "books" | "series";
  deck?: boolean;
  noVariantIndicator?: boolean;
  /** Enlace "Ver todo" del encabezado. */
  moreLink?: string;
}

/**
 * Estantería horizontal con scroll oculto y flechas discretas.
 * Las flechas se habilitan/deshabilitan con IntersectionObserver (sin
 * recalcular en cada frame de scroll).
 */
export function ComponentScroller(props:ComponentScrollerProps):React.ReactElement {
  const {title, components, type, deck, noVariantIndicator, moreLink} = props;
  const navigate = useNavigate();
  const openBook = useOpenBook();
  const ulRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(()=>{
    const ul = ulRef.current;
    if (!ul) return;

    setAtStart(ul.scrollLeft <= 4);
    setAtEnd(ul.scrollLeft >= ul.scrollWidth - ul.clientWidth - 4);
  }, []);

  useEffect(()=>{
    updateEdges();

    const ul = ulRef.current;
    if (!ul) return;

    const observer = new ResizeObserver(updateEdges);
    observer.observe(ul);
    window.addEventListener("resize", updateEdges);

    return ()=>{
      observer.disconnect();
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges, components]);

  function scrollBy(direction: 1 | -1):void {
    const ul = ulRef.current;
    if (!ul) return;

    ul.scrollBy({left:direction * ul.clientWidth * 0.9, behavior:"smooth"});
  }

  const isEmpty = !components || components.length === 0;

  /** Abre un elemento al azar del propio estante ("¿qué leo ahora?"). */
  function openRandom():void {
    if (isEmpty) return;

    const index = Math.floor(Math.random() * components.length);

    if (type === "books") {
      const book = (components as BookWithProgress[])[index];
      void openBook(book, {confirmReread:true});
      return;
    }

    const serie = (components as SerieWithProgress[])[index];
    navigate(`/app/series/${serie._id}`);
  }

  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        <div className="flex items-center gap-1">
          {moreLink ? (
            <Link
              to={moreLink}
              className="mr-1 text-xs font-medium text-fg-muted transition-colors hover:text-primary hover:no-underline"
            >
              Ver todo
            </Link>
          ) : null}
          <IconButton label="Abrir uno al azar" size="sm" variant="solid" disabled={isEmpty} onClick={openRandom}>
            <Dices />
          </IconButton>
          <IconButton label="Desplazar a la izquierda" size="sm" variant="solid" disabled={atStart} onClick={()=>scrollBy(-1)}>
            <ChevronLeft />
          </IconButton>
          <IconButton label="Desplazar a la derecha" size="sm" variant="solid" disabled={atEnd} onClick={()=>scrollBy(1)}>
            <ChevronRight />
          </IconButton>
        </div>
      </div>

      {isEmpty ? null : (
        <ul
          ref={ulRef}
          onScroll={updateEdges}
          className="no-scrollbar -mx-1 -my-1 flex flex-nowrap gap-5 overflow-x-auto px-1 py-3"
        >
          {type === "books"
            ? (components as BookWithProgress[]).map((book)=>(
                <li key={book._id} className="w-36 shrink-0">
                  <CoverCard kind="book" book={book} deck={deck} noVariantIndicator={noVariantIndicator} />
                </li>
              ))
            : (components as SerieWithProgress[]).map((serie)=>(
                <li key={serie._id} className="w-36 shrink-0">
                  <CoverCard kind="serie" serie={serie} noVariantIndicator={noVariantIndicator} />
                </li>
              ))}
        </ul>
      )}
    </section>
  );
}
