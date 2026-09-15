import dayjs from "../../lib/dayjs";
import {Wand2} from "lucide-react";
import {useState} from "react";
import {toast} from "react-toastify";
import {api} from "../../api/api";
import {invalidateBook, invalidateSerie} from "../../lib/invalidate";
import type {Book, BookWithProgress} from "../../types/book";
import {Button} from "../../ui/Button";
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "../../ui/Dialog";
import {Field} from "../../ui/Field";
import {IconButton} from "../../ui/IconButton";
import {Input} from "../../ui/Input";
import {Tooltip} from "../../ui/Tooltip";

interface EditBookDialogProps {
  book: BookWithProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBookDialog({book, open, onOpenChange}:EditBookDialogProps):React.ReactElement {
  const [name, setName] = useState(book.visibleName);
  const [sortName, setSortName] = useState(book.sortName);
  const [releaseDate, setReleaseDate] = useState(book.releaseDate ? dayjs(book.releaseDate).format("YYYY-MM-DD") : "");
  const [saving, setSaving] = useState(false);

  async function getDefaultName():Promise<void> {
    const res = await api.get<{name:string}>(`books/${book._id}/defaultname`);

    if (res?.name) {
      setName(res.name);
    }
  }

  async function save():Promise<void> {
    if (name === "" || sortName === "") {
      toast.error("Rellena todos los campos obligatorios");
      return;
    }

    const body:Partial<Book> = {
      visibleName:name,
      sortName
    };

    if (releaseDate) {
      body.releaseDate = new Date(releaseDate);
    }

    setSaving(true);

    try {
      const response = await api.patch<Partial<Book>, Book>(`books/${book._id}`, body);

      if (response) {
        toast.success(`Datos de ${name} actualizados con éxito`);
        onOpenChange(false);
        invalidateBook(book._id);
        invalidateSerie(book.serie);
      }
    } catch {
      toast.error("No tienes permisos para realizar esa acción");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={(e)=>{
            e.preventDefault();
            void save();
          }}
        >
          <DialogHeader>
            <DialogTitle>Editar libro</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div className="flex items-end gap-2">
              <Field label="Nombre" htmlFor="editbook-name" className="flex-1">
                <Input id="editbook-name" required value={name} onChange={(e)=>setName(e.target.value)} />
              </Field>
              <Tooltip content="Generar nombre automáticamente">
                <IconButton label="Generar nombre automáticamente" variant="solid" onClick={()=>void getDefaultName()}>
                  <Wand2 />
                </IconButton>
              </Tooltip>
            </div>
            <Field label="Nombre para ordenar" htmlFor="editbook-sortname">
              <Input id="editbook-sortname" required value={sortName} onChange={(e)=>setSortName(e.target.value)} />
            </Field>
            <Field label="Fecha de publicación" htmlFor="editbook-release">
              <Input id="editbook-release" type="date" value={releaseDate} onChange={(e)=>setReleaseDate(e.target.value)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={()=>onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
