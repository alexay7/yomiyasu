import React from "react";
import {Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle} from "../../../ui/Dialog";
import {Kbd} from "../../../ui/Kbd";

export interface ShortcutItem {
    keys:string[];
    description:string;
}

interface ShortcutsDialogProps {
    open:boolean;
    onClose:()=>void;
    shortcuts:ShortcutItem[];
}

export function ShortcutsDialog({open, onClose, shortcuts}:ShortcutsDialogProps):React.ReactElement {
    return (
        <Dialog
            open={open}
            onOpenChange={(value)=>{
                if (!value) onClose();
            }}
        >
            <DialogContent size="sm">
                <DialogHeader>
                    <DialogTitle>Atajos de teclado</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <ul className="flex flex-col gap-3">
                        {shortcuts.map((shortcut)=>(
                            <li className="flex items-center gap-4" key={shortcut.description}>
                                <span className="flex min-w-[7rem] gap-1">
                                    {shortcut.keys.map((key)=>(
                                        <Kbd key={key}>{key}</Kbd>
                                    ))}
                                </span>
                                <span className="text-sm text-fg-muted">{shortcut.description}</span>
                            </li>
                        ))}
                    </ul>
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
