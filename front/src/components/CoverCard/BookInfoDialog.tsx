import dayjs from "../../lib/dayjs";
import type {BookWithProgress} from "../../types/book";
import {Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle} from "../../ui/Dialog";

interface BookInfoDialogProps {
  book: BookWithProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookInfoDialog({book, open, onOpenChange}:BookInfoDialogProps):React.ReactElement {
  const rows: Array<[string, string]> = [
    ["Nombre visible", book.visibleName],
    ["Nombre de ordenación", book.sortName],
    ["Ruta", book.path],
    ["Serie", book.seriePath],
    ["Páginas", String(book.pages)],
    ["Caracteres", String(book.characters ?? 0)],
    ["Variante", book.variant === "manga" ? "Manga" : "Novela"],
    ["Mokuro", book.mokured ? "Sí" : "No"],
    ["Añadido", book.createdDate ? dayjs(book.createdDate).format("DD/MM/YYYY HH:mm") : "—"],
    ["Modificado", book.lastModifiedDate ? dayjs(book.lastModifiedDate).format("DD/MM/YYYY HH:mm") : "—"],
    ["Existe?", book.missing ? "No" : "Sí"],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Más información</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <dl className="flex flex-col gap-2 text-sm">
            {rows.map(([label, value])=>(
              <div key={label} className="flex items-baseline justify-between gap-4 border-b border-app-border/60 pb-2 last:border-0">
                <dt className="shrink-0 text-fg-muted">{label}</dt>
                <dd className="truncate text-right font-medium text-fg" title={value}>{value}</dd>
              </div>
            ))}
          </dl>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
