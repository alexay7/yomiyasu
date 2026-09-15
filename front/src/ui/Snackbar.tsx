import {CheckCircle2} from "lucide-react";
import {useEffect} from "react";

interface SnackbarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  duration?: number;
}

/** Aviso flotante breve con autocierre. */
export function Snackbar({open, onOpenChange, message, duration = 2000}:SnackbarProps):React.ReactElement | null {
  useEffect(()=>{
    if (!open) return;

    const timer = window.setTimeout(()=>onOpenChange(false), duration);
    return ()=>window.clearTimeout(timer);
  }, [open, duration, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm text-fg shadow-lg animate-fade-in"
    >
      <CheckCircle2 className="size-4 text-success" />
      {message}
    </div>
  );
}
