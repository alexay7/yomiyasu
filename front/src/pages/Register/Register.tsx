import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router";
import {toast} from "react-toastify";
import {api} from "../../api/api";
import {AuthCard} from "../../components/AuthCard/AuthCard";
import {useTitle} from "../../lib/useTitle";
import {HttpError} from "../../types/error";
import {Button} from "../../ui/Button";
import {Field} from "../../ui/Field";
import {Input} from "../../ui/Input";

function Register():React.ReactElement {
    const [user, setUser] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [invitation, setInvitation] = useState("");
    const [firstUser, setFirstUser] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    useTitle("Crear cuenta");

    // En el primer arranque no hay usuarios: el registro crea la cuenta de
    // administrador y no hace falta código de invitación
    useEffect(() => {
        let cancelled = false;

        api.get<{firstUser:boolean}>("auth/setup")
            .then((res) => {
                if (!cancelled && res) setFirstUser(res.firstUser);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, []);

    async function handleSubmit(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();

        if (!user || !email || !password || (!firstUser && !invitation)) return;

        setSubmitting(true);

        try {
            const res = await api.post<{username:string, email:string, password:string, code:string}, {statusCode?:number}>("invis/redeem", {username:user, email, password, code:invitation});

            if (!res) return;

            toast.success("¡Usuario creado con éxito! Inicia sesión para continuar.");
            navigate("/login");
        } catch (err) {
            const error = err as HttpError;

            switch (error.status) {
                case 401:{
                    toast.error("¡Código de invitación inválido!");
                    break;
                }
                case 429:{
                    toast.error("Vuelve a intentarlo dentro de un minuto");
                    break;
                }
                default:{
                    toast.error("No se pudo crear la cuenta");
                }
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthCard
            title="Bienvenido a YomiYasu"
            subtitle={firstUser ? "Crea la cuenta de administrador del servidor" : "Crea tu cuenta con un código de invitación"}
            footer={
                <p className="text-center text-xs text-fg-muted">
                    ¿Ya tienes cuenta?{" "}
                    <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        onClick={()=>navigate("/login")}
                    >
                        Iniciar sesión
                    </button>
                </p>
            }
        >
            <form className="flex flex-col gap-4" onSubmit={(e)=>void handleSubmit(e)}>
                <Field label="Nombre de usuario" htmlFor="register-user">
                    <Input id="register-user" required autoComplete="username" value={user} onChange={(e)=>setUser(e.target.value)} />
                </Field>
                <Field label="Correo electrónico" htmlFor="register-email">
                    <Input id="register-email" required type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
                </Field>
                <Field label="Contraseña" htmlFor="register-password">
                    <Input id="register-password" required type="password" autoComplete="new-password" value={password} onChange={(e)=>setPassword(e.target.value)} />
                </Field>
                {!firstUser && (
                    <Field label="Código de invitación" htmlFor="register-code">
                        <Input id="register-code" required value={invitation} onChange={(e)=>setInvitation(e.target.value)} />
                    </Field>
                )}
                <Button type="submit" fullWidth loading={submitting} className="mt-2">
                    Crear cuenta
                </Button>
            </form>
        </AuthCard>
    );
}

export default Register;
