import {MessageSquarePlus, Pencil, Trash2} from "lucide-react";
import {useEffect, useState} from "react";
import {useSearchParams} from "react-router";
import {toast} from "react-toastify";
import {api} from "../../../api/api";
import {useAuth} from "../../../contexts/AuthContext";
import {invalidateSerie} from "../../../lib/invalidate";
import {confirmDialog} from "../../../stores/ConfirmStore";
import type {FullSerie, Review} from "../../../types/serie";
import {Badge} from "../../../ui/Badge";
import {EmptyState} from "../../../ui/EmptyState";
import {FlameRating} from "../../../ui/FlameRating";
import {IconButton} from "../../../ui/IconButton";
import {Rating} from "../../../ui/Rating";
import {ReviewFormDialog} from "./AddReview";

interface ReviewProps {
    serieData:FullSerie;
}

export function Reviews({serieData}:ReviewProps):React.ReactElement {
    const {userData} = useAuth();
    const [searchParams] = useSearchParams();
    const [formOpen, setFormOpen] = useState(false);
    const [editingReview, setEditingReview] = useState<Review | null>(null);

    // Flujo "has terminado la serie": abre el formulario automáticamente
    useEffect(()=>{
        if (searchParams.get("finished")) {
            setFormOpen(true);
        }
        // Solo al montar
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function deleteReview(reviewId:string):Promise<void> {
        const res = await api.delete<{status:string}>(`reviews/${reviewId}`);

        if (res) {
            toast.success("Valoración borrada con éxito");
            invalidateSerie(serieData._id);
        }
    }

    return (
        <section className="flex flex-col rounded-xl border border-app-border bg-app-surface">
            <header className="flex items-center justify-between gap-2 border-b border-app-border px-4 py-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-fg">Valoraciones</h3>
                    <Badge variant="neutral">{serieData.reviews.length}</Badge>
                </div>
                <IconButton label="Añadir valoración" variant="primary" size="sm" onClick={()=>{
                    setEditingReview(null);
                    setFormOpen(true);
                }}>
                    <MessageSquarePlus />
                </IconButton>
            </header>

            {serieData.reviews.length === 0 ? (
                <EmptyState
                    title="Todavía no hay valoraciones"
                    description="Comparte tu dificultad y valoración con otros lectores."
                    className="py-8"
                />
            ) : (
                <ul className="flex max-h-96 flex-col divide-y divide-app-border overflow-y-auto">
                    {serieData.reviews.map((review)=>(
                        <li key={review._id} className="relative flex flex-col gap-2 px-4 py-3">
                            {userData?._id === review.user ? (
                                <div className="absolute right-2 top-2 flex gap-1">
                                    <IconButton
                                        label="Editar valoración"
                                        variant="ghost"
                                        size="sm"
                                        onClick={()=>{
                                            setEditingReview(review);
                                            setFormOpen(true);
                                        }}
                                    >
                                        <Pencil />
                                    </IconButton>
                                    <IconButton
                                        label="Borrar valoración"
                                        variant="danger"
                                        size="sm"
                                        onClick={async()=>{
                                            if (await confirmDialog("¿Seguro que quieres borrar la valoración?")) {
                                                void deleteReview(review._id || "");
                                            }
                                        }}
                                    >
                                        <Trash2 />
                                    </IconButton>
                                </div>
                            ) : null}

                            <p className="flex items-center gap-2 pr-8 text-sm text-fg">
                                <span className="font-medium">{review.name}</span>
                                <Badge variant="outline">{review.userLevel}</Badge>
                            </p>

                            <div className="flex items-center gap-2 text-xs text-fg-muted">
                                <span>Dificultad</span>
                                <FlameRating value={review.difficulty} difficulty={(review.difficulty / 5) * 10} />
                            </div>

                            {review.valoration ? (
                                <div className="flex items-center gap-2 text-xs text-fg-muted">
                                    <span>Valoración</span>
                                    <Rating value={review.valoration / 2} />
                                </div>
                            ) : null}

                            {review.comment ? (
                                <p className="rounded-lg border border-dashed border-app-border p-2 text-sm text-fg-muted">
                                    {review.comment}
                                </p>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}

            <ReviewFormDialog serie={serieData} review={editingReview} open={formOpen} onOpenChange={(value)=>{
                setFormOpen(value);
                if (!value) setEditingReview(null);
            }} />
        </section>
    );
}
