import {UserPlus} from "lucide-react";
import React, {useState} from "react";
import {toast} from "react-toastify";
import {useAuth} from "../../../contexts/AuthContext";
import {isValidEmail} from "../../../lib/validators";
import {Button} from "../../../ui/Button";
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "../../../ui/Dialog";
import {Field} from "../../../ui/Field";
import {Input} from "../../../ui/Input";

interface UserCreatorProps {
    refetch: ()=>void
}

export function UserCreator(props:UserCreatorProps):React.ReactElement {
    const {refetch} = props;
    const {registerUser} = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    async function saveChanges(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();

        if (username === "" || password === "" || email === "") {
            toast.error("Rellena todos los campos obligatorios");
            return;
        }

        if (!isValidEmail(email)) {
            toast.error("El correo electrónico no es válido");
            return;
        }

        setSaving(true);

        try {
            const response = await registerUser(username, email, password);

            if (response) {
                toast.success("Usuario registrado con éxito");
                setOpen(false);
                setUsername("");
                setEmail("");
                setPassword("");
                refetch();
            }
        } catch {
            toast.error("No se pudo registrar el usuario");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Button icon={<UserPlus className="size-4" />} onClick={()=>setOpen(true)}>
                Nuevo usuario
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent size="sm">
                    <form
                        className="flex flex-1 flex-col overflow-hidden"
                        onSubmit={(e)=>void saveChanges(e)}
                    >
                        <DialogHeader>
                            <DialogTitle>Registrar nuevo usuario</DialogTitle>
                        </DialogHeader>
                        <DialogBody className="flex flex-col gap-4">
                            <Field label="Nombre de usuario" htmlFor="newuser-username">
                                <Input id="newuser-username" required value={username} onChange={(e)=>setUsername(e.target.value)} />
                            </Field>
                            <Field label="Correo electrónico" htmlFor="newuser-email">
                                <Input id="newuser-email" required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
                            </Field>
                            <Field label="Contraseña" htmlFor="newuser-password">
                                <Input id="newuser-password" required type="password" autoComplete="new-password" value={password} onChange={(e)=>setPassword(e.target.value)} />
                            </Field>
                        </DialogBody>
                        <DialogFooter>
                            <Button variant="secondary" type="button" onClick={()=>setOpen(false)}>Cancelar</Button>
                            <Button type="submit" loading={saving}>Crear usuario</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
