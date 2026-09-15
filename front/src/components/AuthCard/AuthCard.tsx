import {UserRound} from "lucide-react";
import type {ReactNode} from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Marco compartido de las pantallas de autenticación: mantiene la identidad
 * original (gradiente radial + icono de persona en un anillo verde).
 */
export function AuthCard({title, subtitle, children, footer}:AuthCardProps):React.ReactElement {
  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-gradient-radial from-gray-500 to-[#000011] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-8 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <span className="flex size-20 items-center justify-center rounded-full border-2 border-primary text-primary">
            <UserRound className="size-10" strokeWidth={1.5} />
          </span>
          <div className="text-center">
            <h1 className="text-xl font-bold text-fg">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-fg-muted">{subtitle}</p> : null}
          </div>
        </div>

        <div className="mt-6">{children}</div>

        {footer ? <div className="mt-6 border-t border-app-border pt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
