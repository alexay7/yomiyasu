import {useState} from "react";
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
}

const difficultyLabels: Record<number, string> = {
  1: "Muy fácil para mi nivel",
  2: "Fácil para mi nivel",
  3: "Bien para mi nivel",
  4: "Difícil para mi nivel",
  5: "Muy difícil para mi nivel",
};

export function ReviewFormDialog({serie, open, onOpenChange}:ReviewFormDialogProps):React.ReactElement {
  const [difficulty, setDifficulty] = useState(0);
  const [rating, setRating] = useState(0);
  const [userLevel, setUserLevel] = useState(window.localStorage.getItem("userlevel") || "Principiante");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  function reset():void {
    setDifficulty(0);
    setRating(0);
    setComment("");
  }

  async function save():Promise<void> {
    if (!userLevel || difficulty < 1) {
      toast.error("Debes rellenar los campos obligatorios");
      return;
    }

    const review: Review = {
      serie: serie._id,
      userLevel,
      difficulty,
      valoration: rating > 0 ? rating * 2 : null,
      comment
    };

    setSaving(true);

    try {
      const res = await api.post<Review, Review>("reviews", review);

      if (res) {
        toast.success("Valoración emitida con éxito");
        reset();
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
      onOpenChange={(value)=>{
        onOpenChange(value);
        if (!value) reset();
      }}
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
            <DialogTitle>Deja tu valoración personal</DialogTitle>
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
            <Button type="submit" loading={saving}>Publicar valoración</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
