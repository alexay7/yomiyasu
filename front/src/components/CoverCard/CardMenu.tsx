import {
  Archive,
  BookmarkMinus,
  BookmarkPlus,
  BookOpen,
  Calculator,
  CheckCheck,
  Download,
  Ellipsis,
  EyeOff,
  Image,
  Info,
  Pause,
  Play,
  RotateCcw,
  Send,
  SquarePen,
  Tags,
  Trash2,
  Undo2,
  Wand2,
} from "lucide-react";
import {lazy, Suspense, useState} from "react";
import {useNavigate} from "react-router";
import {toast} from "react-toastify";
import {api} from "../../api/api";
import {useAuth} from "../../contexts/AuthContext";
import {addToReadlist, removeFromReadlist} from "../../helpers/series";
import {invalidateBook, invalidateProgress, invalidateReadlist, invalidateSerie} from "../../lib/invalidate";
import {bookDownloadUrl} from "../../lib/media";
import {useOpenBook} from "../../lib/useOpenBook";
import {confirmDialog} from "../../stores/ConfirmStore";
import {useSettingsStore} from "../../stores/SettingsStore";
import type {Book, BookProgress, BookWithProgress} from "../../types/book";
import type {SerieWithProgress} from "../../types/serie";
import {Button} from "../../ui/Button";
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "../../ui/Dialog";
import {IconButton} from "../../ui/IconButton";
import {Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger} from "../../ui/Menu";
import {BookCoversDialog} from "./BookCoversDialog";
import {BookInfoDialog} from "./BookInfoDialog";
import {ProgressEditor} from "./ProgressEditor";

// Los formularios de administración se cargan solo cuando se abren
const LazyEditBookDialog = lazy(() => import("./EditBookDialog").then((m)=>({default:m.EditBookDialog})));
const LazyEditSerieDialog = lazy(() => import("./EditSerieDialog").then((m)=>({default:m.EditSerieDialog})));

export type CardMenuProps =
  | {
      kind: "book";
      book: BookWithProgress;
      insideSerie?: boolean;
      deck?: boolean;
      read: boolean;
      setRead: (value: boolean) => void;
      openBook: (options?: {mouse?: boolean; incognito?: boolean}) => Promise<void>;
    }
  | {
      kind: "serie";
      serie: SerieWithProgress;
      unreadBooks: number;
      onUnreadChanged: (unread: number) => void;
    };

export function CardMenu(props:CardMenuProps):React.ReactElement {
  return props.kind === "book" ? <BookCardMenu {...props} /> : <SerieCardMenu {...props} />;
}

/** Marca de leído con elección de página final. */
function useMarkAsRead(book: BookWithProgress, setRead: (value: boolean) => void): {
  askPage: boolean;
  setAskPage: (value: boolean) => void;
  markAsRead: () => Promise<void>;
  markAsReadPages: (final: boolean) => Promise<void>;
  markAsUnread: () => Promise<void>;
} {
  const [askPage, setAskPage] = useState(false);

  async function sendProgress(body: BookProgress): Promise<void> {
    const response = await api.post<BookProgress, Book>("readprogress", body);

    if (response) {
      invalidateProgress();
      invalidateBook(book._id);
    }
  }

  async function markAsReadPages(final: boolean): Promise<void> {
    setAskPage(false);
    setRead(true);
    await sendProgress({
      book:book._id,
      status:"completed",
      endDate:new Date(),
      currentPage:final ? book.pages : book.lastProgress?.currentPage,
      characters:final ? book.characters : book.lastProgress?.characters
    });
  }

  async function markAsRead(): Promise<void> {
    if (book.lastProgress?.status === "reading") {
      setAskPage(true);
      return;
    }

    await markAsReadPages(true);
  }

  async function markAsUnread(): Promise<void> {
    setRead(false);
    await sendProgress({
      book:book._id,
      currentPage:0,
      status:"unread",
      characters:0
    });
  }

  return {askPage, setAskPage, markAsRead, markAsReadPages, markAsUnread};
}

function BookCardMenu({book, insideSerie, deck, read, setRead, openBook}:Extract<CardMenuProps, {kind:"book"}>):React.ReactElement {
  const {userData} = useAuth();
  const {siteSettings, setOpenSettings} = useSettingsStore();
  const navigate = useNavigate();

  const [progressOpen, setProgressOpen] = useState(false);
  const [coversOpen, setCoversOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const {askPage, setAskPage, markAsRead, markAsReadPages, markAsUnread} = useMarkAsRead(book, setRead);

  async function pauseSerie(): Promise<void> {
    await api.post<unknown, {status:string}>(`serieprogress/pause/${book.serie}`, {});
    invalidateProgress();
  }

  async function recalculateChars(borders?: boolean): Promise<void> {
    const link = borders ? `books/${book._id}/chars?borders=true` : `books/${book._id}/chars`;
    const response = await api.patch<unknown, {status:string}>(link, {});

    if (response) {
      toast.success("Caracteres recalculados");
      invalidateBook(book._id);
      invalidateSerie(book.serie);
    }
  }

  async function toggleReadlist(): Promise<void> {
    if (book.readlist) {
      await removeFromReadlist(book.serie);
    } else {
      await addToReadlist(book.serie);
    }
    invalidateReadlist();
  }

  function sendToKindle(): void {
    if (!siteSettings.kindleEmail) {
      setOpenSettings(true);
      toast.info("Debes configurar el email de tu kindle para poder enviar el libro");
      return;
    }

    window.open(bookDownloadUrl(book));

    toast.info("Se ha descargado el libro a tu dispositivo, ahora se abrirá tu cliente de correo. Añade el libro como archivo adjunto para recibirlo en el kindle. Si recibes un correo de que no se ha podido enviar contacta con el administrador de la página.");

    window.open(`mailto:${siteSettings.kindleEmail}?subject=${book.visibleName}`);
  }

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <IconButton
            label="Más acciones"
            size="sm"
            variant="ghost"
            className="text-fg-muted data-[state=open]:bg-tint"
            onClick={(e)=>e.stopPropagation()}
          >
            <Ellipsis />
          </IconButton>
        </MenuTrigger>
        <MenuContent align="end" className="min-w-[13rem]">
          <MenuLabel>Lectura</MenuLabel>
          <MenuItem onSelect={()=>void openBook({incognito:true})}>
            <EyeOff />
            Leer en incógnito
          </MenuItem>
          {deck ? (
            <MenuItem onSelect={()=>void pauseSerie()}>
              <Pause />
              Pausar serie
            </MenuItem>
          ) : null}
          {(book.lastProgress || read) ? (
            <MenuItem onSelect={()=>setProgressOpen(true)}>
              <SquarePen />
              Editar progreso
            </MenuItem>
          ) : null}
          {(!read || (read && book.status === "reading")) ? (
            <MenuItem onSelect={()=>void markAsRead()}>
              <CheckCheck />
              Marcar como leído
            </MenuItem>
          ) : null}
          {book.status && read ? (
            <MenuItem onSelect={()=>void markAsUnread()}>
              {book.status === "reading" ? <Undo2 /> : <Trash2 />}
              {book.status === "reading" ? "Eliminar progreso actual" : "Marcar como no leído"}
            </MenuItem>
          ) : null}

          <MenuSeparator />
          <MenuLabel>Organización</MenuLabel>
          {!insideSerie ? (
            <MenuItem
              onSelect={()=>navigate(`/app/series/${book.serie}`)}
              onMouseDown={(e)=>{
                if (e.button === 1) {
                  e.preventDefault();
                  window.open(`/app/series/${book.serie}`, "_blank")?.focus();
                }
              }}
            >
              <BookOpen />
              Ir a la serie
            </MenuItem>
          ) : null}
          <MenuItem onSelect={()=>void toggleReadlist()}>
            {book.readlist ? <BookmarkMinus /> : <BookmarkPlus />}
            {book.readlist ? "Quitar de “Leer más tarde”" : "Añadir a “Leer más tarde”"}
          </MenuItem>
          <MenuItem onSelect={()=>window.open(bookDownloadUrl(book))}>
            <Download />
            Descargar libro
          </MenuItem>
          {book.variant === "novela" ? (
            <MenuItem onSelect={sendToKindle}>
              <Send />
              Enviar al kindle
            </MenuItem>
          ) : null}
          <MenuItem onSelect={()=>setInfoOpen(true)}>
            <Info />
            Más información
          </MenuItem>

          {userData?.admin ? (
            <>
              <MenuSeparator />
              <MenuLabel>Administración</MenuLabel>
              <MenuItem onSelect={()=>setEditOpen(true)}>
                <SquarePen />
                Editar libro
              </MenuItem>
              {book.format !== "images" ? (
                <MenuItem onSelect={()=>void recalculateChars()}>
                  <Calculator />
                  Recalcular caracteres
                </MenuItem>
              ) : null}
              {book.format !== "images" ? (
                <MenuItem onSelect={()=>void recalculateChars(true)}>
                  <Tags />
                  Recalcular caracteres (con bordes)
                </MenuItem>
              ) : null}
              {book.variant === "novela" ? (
                <MenuItem onSelect={()=>setCoversOpen(true)}>
                  <Image />
                  Editar portada
                </MenuItem>
              ) : null}
            </>
          ) : null}
        </MenuContent>
      </Menu>

      <ProgressEditor book={book} open={progressOpen} onOpenChange={setProgressOpen} onAllDeleted={()=>setRead(false)} />
      <BookInfoDialog book={book} open={infoOpen} onOpenChange={setInfoOpen} />
      {userData?.admin ? <BookCoversDialog book={book} open={coversOpen} onOpenChange={setCoversOpen} /> : null}
      {userData?.admin ? (
        <Suspense fallback={null}>
          <LazyEditBookDialog book={book} open={editOpen} onOpenChange={setEditOpen} />
        </Suspense>
      ) : null}

      <Dialog open={askPage} onOpenChange={setAskPage}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>¿Hasta qué página?</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={()=>void markAsReadPages(false)}>
              Pág {book.lastProgress?.currentPage}
            </Button>
            <Button className="flex-1" onClick={()=>void markAsReadPages(true)}>
              Pág {book.pages}
            </Button>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setAskPage(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SerieCardMenu({serie, unreadBooks, onUnreadChanged}:Extract<CardMenuProps, {kind:"serie"}>):React.ReactElement {
  const {userData} = useAuth();
  const navigate = useNavigate();
  const openBook = useOpenBook();

  const [editOpen, setEditOpen] = useState(false);

  async function readNext(): Promise<void> {
    if (unreadBooks === 0) {
      if (!await confirmDialog("Ya has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
    }

    const book = await api.get<BookWithProgress>(`books/book/${serie.currentBook}`);

    if (book) {
      await openBook(book, {confirmReread:false});
    }
  }

  async function togglePause(): Promise<void> {
    const action = serie.paused ? "resume" : "pause";
    await api.post<unknown, {status:string}>(`serieprogress/${action}/${serie._id}`, {});
    toast.success(serie.paused ? "Serie reanudada" : "Serie pausada");
    invalidateSerie(serie._id);
    invalidateProgress();
  }

  async function markSerieAsRead(): Promise<void> {
    await api.post<unknown, {status:string}>(`readprogress/${serie._id}`, {});
    toast.success("Serie marcada como leída");
    onUnreadChanged(0);
    invalidateProgress();
  }

  async function setDefaultNames(): Promise<void> {
    await api.patch<unknown, {status:string}>(`series/${serie._id}/defaultname`, {});
    toast.success("Nombres automáticos aplicados");
    invalidateSerie(serie._id);
  }

  async function zipSerie(): Promise<void> {
    const response = await api.post<void, {status:string}>(`series/${serie._id}/zip`);

    if (response) {
      toast.success("Serie comprimida con éxito");
    }
  }

  async function toggleReadlist(): Promise<void> {
    if (serie.readlist) {
      await removeFromReadlist(serie._id, serie.visibleName);
    } else {
      await addToReadlist(serie._id, serie.visibleName);
    }
    invalidateReadlist();
  }

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <IconButton
            label="Más acciones"
            size="sm"
            variant="ghost"
            className="text-fg-muted data-[state=open]:bg-tint"
            onClick={(e)=>e.stopPropagation()}
          >
            <Ellipsis />
          </IconButton>
        </MenuTrigger>
        <MenuContent align="end" className="min-w-[13rem]">
          <MenuLabel>Lectura</MenuLabel>
          <MenuItem onSelect={()=>void readNext()}>
            <Play />
            Leer siguiente volumen
          </MenuItem>
          <MenuItem onSelect={()=>void togglePause()}>
            {serie.paused ? <RotateCcw /> : <Pause />}
            {serie.paused ? "Reanudar serie" : "Pausar serie"}
          </MenuItem>
          {unreadBooks > 0 ? (
            <MenuItem onSelect={()=>void markSerieAsRead()}>
              <CheckCheck />
              Marcar serie como leída
            </MenuItem>
          ) : null}

          <MenuSeparator />
          <MenuLabel>Organización</MenuLabel>
          <MenuItem onSelect={()=>void toggleReadlist()}>
            {serie.readlist ? <BookmarkMinus /> : <BookmarkPlus />}
            {serie.readlist ? "Quitar de “Leer más tarde”" : "Añadir a “Leer más tarde”"}
          </MenuItem>
          <MenuItem onSelect={()=>navigate(`/app/series/${serie._id}`)}>
            <BookOpen />
            Ver serie
          </MenuItem>

          {userData?.admin ? (
            <>
              <MenuSeparator />
              <MenuLabel>Administración</MenuLabel>
              <MenuItem onSelect={()=>setEditOpen(true)}>
                <SquarePen />
                Editar serie
              </MenuItem>
              <MenuItem onSelect={()=>void setDefaultNames()}>
                <Wand2 />
                Aplicar nombres automáticos
              </MenuItem>
              <MenuItem onSelect={()=>void zipSerie()}>
                <Archive />
                Comprimir serie
              </MenuItem>
            </>
          ) : null}
        </MenuContent>
      </Menu>

      {userData?.admin ? (
        <Suspense fallback={null}>
          <LazyEditSerieDialog serie={serie} open={editOpen} onOpenChange={setEditOpen} />
        </Suspense>
      ) : null}
    </>
  );
}
