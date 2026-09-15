import {SearchX} from "lucide-react";
import React from "react";
import {useNavigate} from "react-router";
import {useTitle} from "../../lib/useTitle";
import {Button} from "../../ui/Button";

export default function NotFound():React.ReactElement {
    const navigate = useNavigate();

    useTitle("Página no encontrada");

    return (
        <div className="flex min-h-[70svh] flex-col items-center justify-center gap-4 px-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-tint text-fg-muted">
                <SearchX className="size-8" strokeWidth={1.5} />
            </span>
            <h1 className="text-2xl font-bold text-fg">Página no encontrada</h1>
            <p className="text-sm text-fg-muted">La página que buscas no existe o ha sido movida.</p>
            <Button onClick={()=>navigate("/app")}>Volver al inicio</Button>
        </div>
    );
}
