import dayjs from "../../lib/dayjs";
import {Trash2} from "lucide-react";
import {useEffect, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {toast} from "react-toastify";
import {api} from "../../api/api";
import {invalidateProgress, invalidateBook} from "../../lib/invalidate";
import {keys} from "../../lib/queryKeys";
import {confirmDialog} from "../../stores/ConfirmStore";
import type {BookProgress, BookWithProgress} from "../../types/book";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "../../ui/Accordion";
import {Button} from "../../ui/Button";
import {Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "../../ui/Dialog";
import {Field} from "../../ui/Field";
import {IconButton} from "../../ui/IconButton";
import {Input} from "../../ui/Input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../ui/Select";

interface ProgressEditorProps {
  book: BookWithProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama cuando el libro deja de tener progresos. */
  onAllDeleted?: () => void;
}

function toLocalInput(date?: Date | string | null): string {
  if (!date) return "";

  const parsed = dayjs(date);
  return parsed.isValid() ? parsed.format("YYYY-MM-DDTHH:mm") : "";
}

export function ProgressEditor({book, open, onOpenChange, onAllDeleted}: ProgressEditorProps):React.ReactElement {
  const [progresses, setProgresses] = useState<BookProgress[]>([]);

  const {data} = useQuery({
    queryKey:keys.bookProgresses(book._id),
    queryFn:async()=>{
      const res = await api.get<BookProgress[]>(`readprogress/book/${book._id}`);
      return res ?? [];
    },
    enabled:open
  });

  useEffect(()=>{
    if (data) setProgresses(data);
  }, [data]);

  async function handleDeleted(id: string): Promise<void> {
    const next = progresses.filter((progress)=>progress._id !== id);
    setProgresses(next);

    if (next.length === 0) {
      onAllDeleted?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar progreso</DialogTitle>
          <DialogDescription>{book.visibleName}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {progresses.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">Este libro no tiene progresos registrados.</p>
          ) : (
            <Accordion type="single" collapsible className="flex flex-col gap-2">
              {progresses.map((progress)=>(
                <AccordionItem key={progress._id} value={progress._id!} className="rounded-lg border border-app-border px-3">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-fg-muted">{dayjs(progress.endDate || progress.startDate).format("DD/MM/YYYY HH:mm")}</span>
                      <span className="rounded-full bg-tint px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
                        {progress.status === "completed" ? "Completado" : progress.status === "reading" ? "En progreso" : "Sin empezar"}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ProgressForm
                      progress={progress}
                      onSaved={(updated)=>{
                        setProgresses((prev)=>prev.map((item)=>item._id === updated._id ? updated : item));
                      }}
                      onDeleted={()=>void handleDeleted(progress._id!)}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

interface ProgressFormProps {
  progress: BookProgress;
  onSaved: (progress: BookProgress) => void;
  onDeleted: () => void;
}

function ProgressForm({progress, onSaved, onDeleted}:ProgressFormProps):React.ReactElement {
  const [status, setStatus] = useState<BookProgress["status"]>(progress.status);
  const [minutes, setMinutes] = useState(String(Math.round((progress.time || 0) / 60)));
  const [characters, setCharacters] = useState(String(progress.characters || 0));
  const [pages, setPages] = useState(String(progress.currentPage || 0));
  const [startDate, setStartDate] = useState(toLocalInput(progress.startDate));
  const [endDate, setEndDate] = useState(toLocalInput(progress.endDate));
  const [saving, setSaving] = useState(false);

  async function save():Promise<void> {
    if (!startDate) {
      toast.error("Rellena la fecha de inicio");
      return;
    }

    setSaving(true);

    try {
      const response = await api.patch<Partial<BookProgress>, BookProgress>(`readprogress/${progress._id}`, {
        startDate:new Date(startDate),
        endDate:endDate ? new Date(endDate) : undefined,
        characters:parseInt(characters) || 0,
        time:(parseInt(minutes) || 0) * 60,
        currentPage:parseInt(pages) || 0,
        status
      });

      if (response) {
        toast.success("Cambios guardados con éxito");
        onSaved(response);
        invalidateProgress();
        invalidateBook(progress.book);
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove():Promise<void> {
    if (!await confirmDialog("¿Seguro que quieres borrar el progreso?")) return;

    const response = await api.delete<BookProgress>(`readprogress/${progress._id}`);

    if (response) {
      toast.success("Progreso borrado con éxito");
      onDeleted();
      invalidateProgress();
      invalidateBook(progress.book);
    }
  }

  return (
    <form
      className="flex flex-col gap-3 pb-1"
      onSubmit={(e)=>{
        e.preventDefault();
        void save();
      }}
    >
      <Field label="Estado" htmlFor={`status-${progress._id}`}>
        <Select value={status} onValueChange={(v)=>setStatus(v as BookProgress["status"])}>
          <SelectTrigger id={`status-${progress._id}`} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="reading">En progreso</SelectItem>
            <SelectItem value="unread">Sin empezar</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Minutos" htmlFor={`time-${progress._id}`}>
          <Input id={`time-${progress._id}`} type="number" min={0} value={minutes} onChange={(e)=>setMinutes(e.target.value)} />
        </Field>
        <Field label="Caracteres" htmlFor={`chars-${progress._id}`}>
          <Input id={`chars-${progress._id}`} type="number" min={0} value={characters} onChange={(e)=>setCharacters(e.target.value)} />
        </Field>
        <Field label="Páginas" htmlFor={`pages-${progress._id}`}>
          <Input id={`pages-${progress._id}`} type="number" min={0} value={pages} onChange={(e)=>setPages(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Inicio" htmlFor={`start-${progress._id}`}>
          <Input id={`start-${progress._id}`} type="datetime-local" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
        </Field>
        <Field label="Fin" htmlFor={`end-${progress._id}`}>
          <Input id={`end-${progress._id}`} type="datetime-local" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center justify-between pt-1">
        <IconButton label="Borrar progreso" variant="danger" size="sm" type="button" onClick={()=>void remove()}>
          <Trash2 />
        </IconButton>
        <Button size="sm" type="submit" loading={saving}>Guardar cambios</Button>
      </div>
    </form>
  );
}
