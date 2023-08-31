import {Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Slide} from "@mui/material";
import React, {forwardRef} from "react";
import {TransitionProps} from "react-transition-group/Transition";

interface PopupWindowProps {
    title:string;
    open:boolean;
    closePopup:()=>void;
    children:React.ReactNode;
    onSubmit?:(e:React.FormEvent<HTMLFormElement>)=>void,
    customSaveButton?:string;
}

const Transition = forwardRef((
    props: TransitionProps & {
        children: React.JSX.Element;
    },
    ref: React.Ref<unknown>
) => {
    return <Slide direction="up" ref={ref} {...props} />;
});

export function PopupWindow(props:PopupWindowProps):React.ReactElement {
    const {title, open, closePopup, children, onSubmit, customSaveButton} = props;

    return (
        <Dialog scroll="paper" fullWidth={true} open={open} onClose={closePopup} keepMounted TransitionComponent={Transition}>
            <DialogTitle>{title}</DialogTitle>
            {onSubmit ? (
                <form onSubmit={onSubmit}>
                    <Divider/>
                    <DialogContent>
                        {children}
                    </DialogContent>
                    <DialogActions>
                        <Button color="inherit" onClick={closePopup}>Cerrar</Button>
                        <Button type="submit">{customSaveButton ? customSaveButton : "Guardar cambios"}</Button>
                    </DialogActions>
                </form>
            ) : (
                <div>
                    <Divider/>
                    <DialogContent>
                        {children}
                    </DialogContent>
                    <DialogActions>
                        <Button color="inherit" onClick={closePopup}>Cerrar</Button>
                        {onSubmit && (
                            <Button type="submit">{customSaveButton ? customSaveButton : "Guardar cambios"}</Button>
                        )}
                    </DialogActions>
                </div>
            )}
        </Dialog>
    );
}