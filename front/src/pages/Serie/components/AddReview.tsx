import {useEffect, useState} from "react";
import {toast} from "react-toastify";
import {api} from "../../../api/api";
import {invalidateSerie} from "../../../lib/invalidate";
import type {Review, SerieWithProgress} from "../../../types/serie";
import {Button} from "../../../ui/Button";
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "../../../ui/Dialog";
import {Field} from "../../../ui/Field";
import {FlameRating} from "../../../ui/FlameRating";
import {RatingInput} from "../../../ui/Rating";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../../ui/Select";
import {Textarea} from "../../../ui/Textarea";

interface ReviewFormDialogProps {
  serie: SerieWithProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reseña a editar; si no se pasa, el formulario crea una nueva. */
  review?: Review | null;
}

const difficultyLabels: Record<number, string> = {
  1: "Muy fácil para mi nivel",
  2: "Fácil para mi nivel",
  3: "Bien para mi nivel",
  4: "Difícil para mi nivel",
  5: "Muy difícil para mi nivel",
};

export function ReviewFormDialog({serie, open, onOpenChange, review}:ReviewFormDialogProps):React.ReactElement {
  const [difficulty, setDifficulty] = useState(0);
  const [rating, setRating] = useState(0);
  const [userLevel, setUserLevel] = useState(window.localStorage.getItem("userlevel") || "Principiante");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = !!review;

  // Al abrir, precarga la reseña a editar o parte de cero
  useEffect(()=>{
    if (!open) return;

    setDifficulty(review?.difficulty ?? 0);
    setRating(review?.valoration ? review.valoration / 2 : 0);
    setComment(review?.comment ?? "");
    setUserLevel(review?.userLevel ?? window.localStorage.getItem("userlevel") ?? "Principiante");
  }, [open, review]);

  async function save():Promise<void> {
    if (!userLevel || difficulty < 1) {
      toast.error("Debes rellenar los campos obligatorios");
      return;
    }

    const reviewBody = {
      userLevel,
      difficulty,
      valoration: rating > 0 ? rating * 2 : null,
      comment
    };

    setSaving(true);

    try {
      const res = review?._id
        ? await api.patch<typeof reviewBody, Review>(`reviews/${review._id}`, reviewBody)
        : await api.post<typeof reviewBody & {serie:string}, Review>("reviews", {...reviewBody, serie:serie._id});

      if (res) {
        toast.success(isEditing ? "Valoración actualizada con éxito" : "Valoración emitida con éxito");
        onOpenChange(false);
        invalidateSerie(serie._id);
        return;
      }

      toast.error("Algo salió mal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent size="sm">
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={(e)=>{
            e.preventDefault();
            void save();
          }}
        >
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edita tu valoración" : "Deja tu valoración personal"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5">
            <Field label="¿Cuál consideras que es tu nivel de japonés? *">
              <Select
                value={userLevel}
                onValueChange={(value)=>{
                  window.localStorage.setItem("userlevel", value);
                  setUserLevel(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Principiante", "N5", "N4", "N3", "N2", "N1", "N1+"].map((level)=>(
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="¿Qué tan difícil te ha parecido? *">
              <div className="flex items-center gap-3">
                <FlameRating value={difficulty} onChange={setDifficulty} size="md" />
                <span className="text-sm text-fg-muted">{difficultyLabels[difficulty] ?? "Selecciona un nivel"}</span>
              </div>
            </Field>

            <Field label="¿Cuál es tu valoración personal? (opcional)">
              <RatingInput value={rating} onChange={setRating} />
            </Field>

            <Field label="¿Tienes comentarios sobre el libro? (opcional)" htmlFor="review-comment">
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e)=>setComment(e.target.value)}
                maxLength={500}
                placeholder="Máximo de 500 caracteres"
                rows={4}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={()=>onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{isEditing ? "Guardar cambios" : "Publicar valoración"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
