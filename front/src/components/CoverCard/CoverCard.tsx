import {Book as BookIcon, Images, Play, TriangleAlert} from "lucide-react";
import {useEffect, useState, type MouseEvent} from "react";
import {Link} from "react-router";
import {useSettingsStore} from "../../stores/SettingsStore";
import type {BookWithProgress} from "../../types/book";
import type {SerieWithProgress} from "../../types/serie";
import {Rating} from "../../ui/Rating";
import {ProgressBar} from "../../ui/ProgressBar";
import {Tooltip} from "../../ui/Tooltip";
import {cn} from "../../ui/cn";
import {getBookInfoText, getBookProgressPercent} from "../../lib/bookInfo";
import {bookThumbnail, serieThumbnail} from "../../lib/media";
import {CoverImage} from "../CoverImage";
import {useOpenBook} from "../../lib/useOpenBook";
import {getFlameColor} from "../../helpers/series";
import {CardMenu} from "./CardMenu";

export type CoverCardProps =
  | {
      kind: "book";
      book: BookWithProgress;
      insideSerie?: boolean;
      deck?: boolean;
      forceRead?: boolean;
      blurred?: boolean;
      noVariantIndicator?: boolean;
      className?: string;
    }
  | {
      kind: "serie";
      serie: SerieWithProgress;
      noVariantIndicator?: boolean;
      className?: string;
    };

export function CoverCard(props:CoverCardProps):React.ReactElement {
  return props.kind === "book" ? <BookCoverCard {...props} /> : <SerieCoverCard {...props} />;
}

/** Marco común: portada con hover característico (anillo + zoom + CTA). */
interface CoverFrameProps {
  imageUrl: string;
  alt: string;
  blurred?: boolean;
  coverLink?: {to: string; onClick?: (e:MouseEvent<HTMLAnchorElement>) => void};
  onOpen: (mouse?: boolean) => void;
  ctaIcon: typeof Play;
  children?: React.ReactNode;
  overlay?: React.ReactNode;
}

function CoverFrame({imageUrl, alt, blurred, coverLink, onOpen, ctaIcon: CtaIcon, children, overlay}:CoverFrameProps):React.ReactElement {
  const {siteSettings} = useSettingsStore();

  const coverContent = (
    <CoverImage
      className={cn(
        "h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-110 group-hover/card:blur-[2px]",
        blurred && siteSettings.antispoilers && "blur-md",
      )}
      loading="lazy"
      decoding="async"
      src={encodeURI(imageUrl)}
      alt={alt}
    />
  );

  return (
    <div className="relative aspect-[9/13] overflow-hidden rounded-t-lg bg-app-chrome">
      {coverLink ? (
        <Link
          to={coverLink.to}
          onClick={coverLink.onClick}
          className="absolute inset-0 z-[1] block"
          tabIndex={-1}
          aria-hidden
        >
          {coverContent}
        </Link>
      ) : (
        <button
          type="button"
          className="absolute inset-0 z-[1] block cursor-pointer"
          tabIndex={-1}
          aria-hidden
          onClick={()=>onOpen()}
          onMouseDown={(e)=>{
            if (e.button === 1) {
              e.preventDefault();
              onOpen(true);
            }
          }}
        >
          {coverContent}
        </button>
      )}

      <span
        className="pointer-events-none absolute inset-0 z-[2] rounded-t-lg ring-primary transition-all duration-150 group-hover/card:ring-4 group-hover/card:ring-inset group-hover/card:opacity-90"
        aria-hidden
      />

      {children}

      <span
        className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover/card:opacity-100"
        aria-hidden
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-white text-primary shadow-lg">
          <CtaIcon className="size-6" fill="currentColor" strokeWidth={1} />
        </span>
      </span>

      {overlay}
    </div>
  );
}

function BookCoverCard({
  book,
  insideSerie,
  deck,
  forceRead,
  blurred,
  noVariantIndicator,
  className,
}:Extract<CoverCardProps, {kind:"book"}>):React.ReactElement {
  const {siteSettings} = useSettingsStore();
  const openBook = useOpenBook();

  const [read, setRead] = useState(Boolean(book.status && book.status !== "unread"));

  useEffect(()=>{
    if (forceRead) setRead(true);
  }, [forceRead]);

  const percent = getBookProgressPercent(book, read);
  const showVariant = siteSettings.mainView === "both" && !noVariantIndicator;

  return (
    <div className={cn("group/card relative flex w-full flex-col", className)}>
      <CoverFrame
        imageUrl={bookThumbnail(book)}
        alt={book.visibleName}
        blurred={blurred}
        onOpen={(mouse)=>void openBook(book, {mouse, confirmReread:true})}
        ctaIcon={Play}
      >
        {!read ? (
          <span
            className={cn(
              "absolute right-0 top-0 z-[2] h-0 w-0 border-y-transparent border-l-transparent",
              book.readlist ? "border-r-accent" : "border-r-primary",
            )}
            style={{borderWidth:"0 35px 35px 0"}}
            aria-hidden
          />
        ) : null}

        {book.mokured ? (
          <span className="absolute left-1 top-1 z-[2]">
            <Tooltip content="Esta novela ha sido generada con mokuro, ¡NO es un epub!">
              <span className="flex size-6 items-center justify-center rounded-full bg-white/90 text-warning shadow-sm">
                <TriangleAlert className="size-3.5" />
              </span>
            </Tooltip>
          </span>
        ) : null}

        {book.format === "images" ? (
          <span className="absolute left-1 top-1 z-[2]">
            <Tooltip content="Manga de imágenes: solo portada y páginas, sin texto OCR">
              <span className="flex size-6 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm">
                <Images className="size-3.5" />
              </span>
            </Tooltip>
          </span>
        ) : null}

        <ProgressBar
          value={percent}
          className="absolute bottom-0 left-0 z-[2] h-1 bg-transparent"
          barClassName="bg-primary"
        />
      </CoverFrame>

      <div className="flex flex-col gap-0.5 rounded-b-lg border border-t-0 border-app-border bg-app-surface px-2.5 pb-1.5 pt-2">
        <Link
          to={`/reader/${book._id}`}
          onClick={(e)=>{
            e.preventDefault();
            void openBook(book, {confirmReread:true});
          }}
          onMouseDown={(e)=>{
            if (e.button === 1) {
              e.preventDefault();
              void openBook(book, {mouse:true, confirmReread:true});
            }
          }}
          className="line-clamp-2 h-10 text-[13px] font-medium leading-tight text-fg transition-colors hover:text-primary hover:no-underline"
        >
          {showVariant ? <span className="text-fg-muted">{book.variant === "manga" || book.mokured ? "[漫]" : "[小]"} </span> : null}
          {book.visibleName}
        </Link>
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-[11px] text-fg-muted" title={getBookInfoText(book, siteSettings.bookView)}>
            {getBookInfoText(book, siteSettings.bookView)}
          </p>
          <CardMenu
            kind="book"
            book={book}
            insideSerie={insideSerie}
            deck={deck}
            read={read}
            setRead={setRead}
            openBook={(options)=>openBook(book, {...options, confirmReread:true})}
          />
        </div>
      </div>
    </div>
  );
}

function SerieCoverCard({
  serie,
  noVariantIndicator,
  className,
}:Extract<CoverCardProps, {kind:"serie"}>):React.ReactElement {
  const {siteSettings} = useSettingsStore();
  const [unreadBooks, setUnreadBooks] = useState(serie.unreadBooks);

  useEffect(()=>{
    setUnreadBooks(serie.unreadBooks);
  }, [serie.unreadBooks]);

  const showVariant = siteSettings.mainView === "both" && !noVariantIndicator;

  return (
    <div className={cn("group/card relative flex w-full flex-col", className)}>
      <CoverFrame
        imageUrl={serieThumbnail(serie)}
        alt={serie.visibleName}
        onOpen={()=>undefined}
        ctaIcon={BookIcon}
        coverLink={{to:`/app/series/${serie._id}`}}
      >
        {unreadBooks > 0 ? (
          <span
            className={cn(
              "absolute right-0 top-0 z-[2] min-w-6 rounded-bl-md px-1.5 py-0.5 text-center text-xs font-semibold text-white",
              serie.readlist ? "bg-accent" : "bg-primary",
            )}
          >
            {unreadBooks}
          </span>
        ) : null}

        {serie.difficulty > 0 ? (
          <span className="absolute left-1 top-1 z-[2]">
            <Tooltip content={`Dificultad: ${serie.difficulty.toFixed(1)}/10`}>
              <span className="flex size-6 items-center justify-center rounded-full bg-white shadow-sm">
                <svg viewBox="0 0 24 24" className="size-3.5" fill={getFlameColor(serie.difficulty)} aria-hidden>
                  <path d="M12 2c1 3-2 4.5-2 7a2 2 0 0 0 4 .2C15.5 11.5 18 13 18 16a6 6 0 0 1-12 0c0-5 4-6.5 6-14Z" />
                </svg>
              </span>
            </Tooltip>
          </span>
        ) : null}

        {serie.valoration ? (
          <span className="absolute bottom-1 right-1 z-[2] flex items-center rounded-full bg-white px-1.5 py-1 shadow-sm">
            <Rating value={serie.valoration / 2} />
          </span>
        ) : null}
      </CoverFrame>

      <div className="flex flex-col gap-0.5 rounded-b-lg border border-t-0 border-app-border bg-app-surface px-2.5 pb-1.5 pt-2">
        <Link
          to={`/app/series/${serie._id}`}
          className="line-clamp-2 h-10 text-[13px] font-medium leading-tight text-fg transition-colors hover:text-primary hover:no-underline"
        >
          {showVariant ? <span className="text-fg-muted">{serie.variant === "manga" ? "[漫]" : "[小]"} </span> : null}
          {serie.visibleName}
        </Link>
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-[11px] text-fg-muted">{serie.bookCount} libros</p>
          <CardMenu kind="serie" serie={serie} unreadBooks={unreadBooks} onUnreadChanged={setUnreadBooks} />
        </div>
      </div>
    </div>
  );
}
