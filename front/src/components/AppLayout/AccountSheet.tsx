import {useEffect, useState} from "react";
import {toast} from "react-toastify";
import {api} from "../../api/api";
import {useAuth} from "../../contexts/AuthContext";
import {UpdateProfile} from "../../types/user";
import {Button} from "../../ui/Button";
import {Field} from "../../ui/Field";
import {Input} from "../../ui/Input";
import {Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle} from "../../ui/Sheet";
import {Separator} from "../../ui/Separator";

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSheet({open, onOpenChange}:AccountSheetProps):React.ReactElement {
  const {userData, logoutUser} = useAuth();
  const [username, setUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(()=>{
    if (userData) {
      setUsername(userData.username);
    }
  }, [userData]);

  async function saveChanges(e:React.FormEvent<HTMLFormElement>):Promise<void> {
    e.preventDefault();

    const body:UpdateProfile = {};
    let changes = false;

    if (username !== userData?.username) {
      changes = true;
      body.newUsername = username;
    }

    if (oldPassword && newPassword && confirmPassword) {
      if (newPassword !== confirmPassword) {
        toast.error("Las contraseñas no coinciden");
        return;
      }
      changes = true;
      body.oldPassword = oldPassword;
      body.newPassword = newPassword;
    }

    if (!changes) return;

    try {
      await api.patch<UpdateProfile, {status:string}>("users/update", body);
      toast.success("Perfil actualizado con éxito");
      onOpenChange(false);

      if (body.oldPassword && body.newPassword) {
        await logoutUser();
      }
    } catch {
      toast.error("La contraseña no es correcta");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="sm">
        <form className="flex h-full flex-col" onSubmit={saveChanges}>
          <SheetHeader>
            <SheetTitle>Ajustes de cuenta</SheetTitle>
            <SheetDescription>Perfil y contraseña</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            <Field label="Nombre de usuario" htmlFor="account-username">
              <Input
                id="account-username"
                autoComplete="username"
                required
                value={username}
                onChange={(e)=>setUsername(e.target.value)}
              />
            </Field>
            <Field label="Correo electrónico">
              <Input type="email" autoComplete="email" disabled value={userData?.email ?? ""} />
            </Field>
            <Separator className="my-1" />
            <p className="text-[13px] font-semibold uppercase tracking-wider text-fg-muted/80">Cambiar contraseña</p>
            <Field label="Contraseña actual" htmlFor="account-old-password">
              <Input
                id="account-old-password"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e)=>setOldPassword(e.target.value)}
              />
            </Field>
            <Field label="Nueva contraseña" htmlFor="account-new-password">
              <Input
                id="account-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e)=>setNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Repetir nueva contraseña" htmlFor="account-confirm-password">
              <Input
                id="account-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e)=>setConfirmPassword(e.target.value)}
              />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="secondary" onClick={()=>onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Guardar cambios</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
