import {create} from "zustand";

interface ConfirmState {
    message:string | null;
    resolver:((value:boolean)=>void) | null;
    resolve:(value:boolean)=>void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
    message: null,
    resolver: null,
    resolve: (value) => {
        get().resolver?.(value);
        set({message: null, resolver: null});
    }
}));

export function confirmDialog(message:string):Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        useConfirmStore.setState({message, resolver:resolve});
    });
}
