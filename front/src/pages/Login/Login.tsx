import React, {useState} from "react";
import {useLocation, useNavigate} from "react-router";
import {AuthCard} from "../../components/AuthCard/AuthCard";
import {useAuth} from "../../contexts/AuthContext";
import {useTitle} from "../../lib/useTitle";
import {Button} from "../../ui/Button";
import {Field} from "../../ui/Field";
import {Input} from "../../ui/Input";

function Login():React.ReactElement {
    const {loginUser} = useAuth();
    const [emailUser, setEmailUser] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useTitle("Iniciar sesión");

    // Destino solicitado antes de iniciar sesión (p. ej. deep link al lector)
    const from = (location.state as {from?:string} | null)?.from || "/";

    async function handleSubmit(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();

        if (!emailUser || !password) return;

        setSubmitting(true);

        try {
            const response = await loginUser(emailUser, password);

            if (response && response.status === "ok") {
                navigate(from, {replace:true});
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthCard
            title="Inicio de sesión"
            subtitle="Tu biblioteca de manga y novelas con OCR"
            footer={
                <div className="flex flex-col gap-2">
                    <Button variant="secondary" fullWidth onClick={()=>navigate("/offline")}>
                        Abrir lector local (sin cuenta)
                    </Button>
                    <p className="text-center text-xs text-fg-muted">
                        ¿Tienes un código de invitación?{" "}
                        <button
                            type="button"
                            className="font-medium text-primary hover:underline"
                            onClick={()=>navigate("/coderedeem")}
                        >
                            Crear cuenta
                        </button>
                    </p>
                </div>
            }
        >
            <form className="flex flex-col gap-4" onSubmit={(e)=>void handleSubmit(e)}>
                <Field label="Nombre de usuario o email" htmlFor="login-user">
                    <Input
                        id="login-user"
                        required
                        autoComplete="username"
                        value={emailUser}
                        onChange={(e)=>setEmailUser(e.target.value)}
                    />
                </Field>
                <Field label="Contraseña" htmlFor="login-password">
                    <Input
                        id="login-password"
                        required
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e)=>setPassword(e.target.value)}
                    />
                </Field>
                <Button type="submit" fullWidth loading={submitting} className="mt-2">
                    Iniciar sesión
                </Button>
            </form>
        </AuthCard>
    );
}

export default Login;
