import {Dialog, DialogContent, DialogTitle, Divider} from "@mui/material";
import React from "react";

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
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Atajos de teclado</DialogTitle>
            <Divider/>
            <DialogContent>
                <ul className="flex flex-col gap-3">
                    {shortcuts.map((shortcut)=>(
                        <li className="flex items-center gap-4" key={shortcut.description}>
                            <span className="flex gap-1 min-w-[7rem]">
                                {shortcut.keys.map((key)=>(
                                    <kbd key={key} className="px-2 py-1 text-xs rounded border border-solid border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-[#2a2a2a]">
                                        {key}
                                    </kbd>
                                ))}
                            </span>
                            <span>{shortcut.description}</span>
                        </li>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    );
}
