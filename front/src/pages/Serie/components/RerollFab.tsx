import {Dices, X} from "lucide-react";
import React, {useState} from "react";
import {useLocation, useNavigate} from "react-router";
import {toast} from "react-toastify";
import {rollRandomSerie, type RandomVariant} from "../../../lib/randomSerie";
import {IconButton} from "../../../ui/IconButton";
import {Tooltip} from "../../../ui/Tooltip";

/**
 * Botón flotante para repetir la tirada del dado tras aterrizar en una serie
 * elegida al azar (#180): permite "spamear" sin volver a la biblioteca.
 * Se descarta por navegación (cada entrada de historial lo vuelve a mostrar).
 */
export function RerollFab():React.ReactElement | null {
    const location = useLocation();
    const navigate = useNavigate();
    const [dismissedKey, setDismissedKey] = useState<string | null>(null);
    const [rolling, setRolling] = useState(false);

    const variant = (location.state as {randomRoll?:RandomVariant} | null)?.randomRoll;
    const dismissed = dismissedKey === location.key;

    if (!variant || dismissed) return null;

    async function reroll():Promise<void> {
        setRolling(true);

        try {
            const serie = await rollRandomSerie(variant!);

            if (!serie) {
                toast.error("Ninguna serie coincide con los filtros indicados");
                return;
            }

            navigate(`/app/series/${serie._id}`, {state:{randomRoll:variant}, replace:true});
        } catch {
            toast.error("Ninguna serie coincide con los filtros indicados");
        } finally {
            setRolling(false);
        }
    }

    return (
        <div className="fixed bottom-20 right-4 z-30 flex items-center gap-1 lg:bottom-6">
            <Tooltip content="Descartar">
                <IconButton label="Descartar tirada aleatoria" variant="solid" onClick={()=>setDismissedKey(location.key)}>
                    <X />
                </IconButton>
            </Tooltip>
            <Tooltip content="Volver a tirar el dado con los mismos criterios">
                <IconButton label="Volver a tirar el dado" variant="primary" size="lg" loading={rolling} onClick={()=>void reroll()}>
                    <Dices />
                </IconButton>
            </Tooltip>
        </div>
    );
}
