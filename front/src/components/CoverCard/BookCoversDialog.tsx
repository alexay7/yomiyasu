import {ImageIcon} from "lucide-react";
import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {toast} from "react-toastify";
import {api} from "../../api/api";
import {invalidateBook} from "../../lib/invalidate";
import {keys} from "../../lib/queryKeys";
import type {BookWithProgress} from "../../types/book";
import {Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "../../ui/Dialog";
import {Input} from "../../ui/Input";
import {Spinner} from "../../ui/Spinner";
import {cn} from "../../ui/cn";

interface BookCoversDialogProps {
  book: BookWithProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BookImage {
  id: string;
  href: string;
  mediaType?: string;
  "media-type"?: string;
}

/**
 * Selector de portada para EPUBs. El backend sirve las imágenes embebidas del
 * EPUB con el endpoint de listado; se muestran por nombre hasta que exista una
 * ruta que las sirva individualmente.
 */
export function BookCoversDialog({book, open, onOpenChange}:BookCoversDialogProps):React.ReactElement {
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const {data:images = [], isLoading} = useQuery({
    queryKey:keys.bookImages(book._id),
    queryFn:async()=>{
      const res = await api.get<BookImage[]>(`books/${book._id}/images`);
      return res ?? [];
    },
    enabled:open
  });

  const filtered = useMemo(()=>{
    const query = filter.trim().toLowerCase();
    if (!query) return images;
    return images.filter((image)=>image.href.toLowerCase().includes(query) || image.id.toLowerCase().includes(query));
  }, [images, filter]);

  async function selectCover(image: BookImage):Promise<void> {
    setSaving(image.id);

    try {
      const response = await api.patch(`books/${book._id}/cover`, {cover:image.id});

      if (response) {
        toast.success("Portada cambiada correctamente");
        invalidateBook(book._id);
        onOpenChange(false);
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Editar portada</DialogTitle>
          <DialogDescription>Imágenes embebidas en {book.visibleName}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <Input
            placeholder="Filtrar por nombre…"
            value={filter}
            onChange={(e)=>setFilter(e.target.value)}
            leadingIcon={<ImageIcon />}
          />
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner size={20} /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-muted">No hay imágenes que coincidan.</p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
              {filtered.map((image)=>(
                <li key={image.id}>
                  <button
                    type="button"
                    onClick={()=>void selectCover(image)}
                    disabled={saving !== null}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border border-app-border bg-app-surface px-2.5 py-2 text-left text-xs transition-colors",
                      "hover:border-primary/50 hover:bg-tint disabled:opacity-50",
                    )}
                  >
                    {saving === image.id ? <Spinner size={14} /> : <ImageIcon className="size-3.5 shrink-0 text-fg-muted" />}
                    <span className="truncate">{image.href || image.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
