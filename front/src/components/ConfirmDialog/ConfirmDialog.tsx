import {useConfirmStore} from "../../stores/ConfirmStore";
import {Button} from "../../ui/Button";
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "../../ui/Dialog";

export function ConfirmDialog():React.ReactElement {
    const {message, resolve} = useConfirmStore();

    return (
        <Dialog
            open={Boolean(message)}
            onOpenChange={(open)=>{
                if (!open) resolve(false);
            }}
        >
            <DialogContent size="sm">
                <DialogHeader>
                    <DialogTitle>Confirmación</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <p className="text-sm text-fg-muted">{message}</p>
                </DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={()=>resolve(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={()=>resolve(true)} autoFocus>
                        Aceptar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
