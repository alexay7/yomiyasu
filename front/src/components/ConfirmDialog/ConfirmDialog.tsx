import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from "@mui/material";
import React from "react";
import {useConfirmStore} from "../../stores/ConfirmStore";

export function ConfirmDialog():React.ReactElement {
    const {message, resolve} = useConfirmStore();

    return (
        <Dialog open={!!message} onClose={()=>resolve(false)}>
            <DialogTitle>Confirmación</DialogTitle>
            <DialogContent>
                <DialogContentText>{message}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={()=>resolve(false)}>Cancelar</Button>
                <Button variant="contained" onClick={()=>resolve(true)}>Aceptar</Button>
            </DialogActions>
        </Dialog>
    );
}
