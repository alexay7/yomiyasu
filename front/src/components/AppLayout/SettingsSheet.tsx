import {useState} from "react";
import {toast} from "react-toastify";
import {useSettingsStore} from "../../stores/SettingsStore";
import {Button} from "../../ui/Button";
import {Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogTitle} from "../../ui/Dialog";
import {Field} from "../../ui/Field";
import {Input} from "../../ui/Input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../ui/Select";
import {Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "../../ui/Sheet";
import {Switch} from "../../ui/Switch";
import {isValidEmail} from "../../lib/validators";

interface SettingSwitchProps {
  label:string;
  description?:string;
  checked:boolean;
  onCheckedChange:(checked:boolean)=>void;
}

function SettingSwitch({label, description, checked, onCheckedChange}:SettingSwitchProps):React.ReactElement {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1.5">
      <span className="flex flex-col">
        <span className="text-sm text-fg">{label}</span>
        {description ? <span className="text-xs text-fg-muted">{description}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

export function SettingsSheet():React.ReactElement {
  const {siteSettings, modifySiteSettings, openSettings, setOpenSettings} = useSettingsStore();
  const [openWarning, setOpenWarning] = useState(false);
  const [kindleEmail, setKindleEmail] = useState(siteSettings.kindleEmail || "");

  function saveKindleEmail():void {
    if (!isValidEmail(kindleEmail)) {
      toast.error("Debes introducir un email válido");
      return;
    }

    modifySiteSettings("kindleEmail", kindleEmail);
    toast.success("Email guardado correctamente");
  }

  return (
    <>
      <Sheet open={openSettings} onOpenChange={setOpenSettings}>
        <SheetContent width="md">
          <SheetHeader>
            <SheetTitle>Ajustes</SheetTitle>
            <SheetDescription>Preferencias del lector y del catálogo</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-fg-muted/80">Inicio</h3>
              <Field label="¿Qué tipo de medio quieres ver en el inicio?">
                <Select
                  value={siteSettings.mainView}
                  onValueChange={(v)=>modifySiteSettings("mainView", v as "manga" | "novels" | "both")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Mangas y novelas</SelectItem>
                    <SelectItem value="manga">Solo mangas</SelectItem>
                    <SelectItem value="novels">Solo novelas</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Información mostrada en cada libro">
                <Select
                  value={siteSettings.bookView}
                  onValueChange={(v)=>modifySiteSettings("bookView", v as "characters" | "pages" | "both" | "remainingpages" | "remainingchars" | "remainingtime")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pages">Páginas</SelectItem>
                    <SelectItem value="characters">Caracteres</SelectItem>
                    <SelectItem value="both">Páginas y caracteres</SelectItem>
                    <SelectItem value="remainingpages">Páginas restantes</SelectItem>
                    <SelectItem value="remainingchars">Caracteres restantes</SelectItem>
                    <SelectItem value="remainingtime">Tiempo restante</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <SettingSwitch
                label="Filtro anti-spoilers"
                description="Difumina las portadas de volúmenes no leídos"
                checked={siteSettings.antispoilers}
                onCheckedChange={(c)=>modifySiteSettings("antispoilers", c)}
              />
              <div className="flex flex-col gap-1 pt-2">
                <h4 className="text-sm font-medium text-fg">Tableros del inicio</h4>
                <p className="text-xs text-fg-muted">Elige qué secciones quieres ver en el inicio</p>
                <div className="mt-1 flex flex-col">
                  <SettingSwitch
                    label="En progreso"
                    checked={siteSettings.showBoardProgress}
                    onCheckedChange={(c)=>modifySiteSettings("showBoardProgress", c)}
                  />
                  <SettingSwitch
                    label="Tu tablero"
                    checked={siteSettings.showBoardTablero}
                    onCheckedChange={(c)=>modifySiteSettings("showBoardTablero", c)}
                  />
                  <SettingSwitch
                    label="Leer más tarde"
                    checked={siteSettings.showBoardReadLater}
                    onCheckedChange={(c)=>modifySiteSettings("showBoardReadLater", c)}
                  />
                  <SettingSwitch
                    label="Pausadas"
                    checked={siteSettings.showBoardPaused}
                    onCheckedChange={(c)=>modifySiteSettings("showBoardPaused", c)}
                  />
                  <SettingSwitch
                    label="Libros nuevos"
                    checked={siteSettings.showBoardNewBooks}
                    onCheckedChange={(c)=>modifySiteSettings("showBoardNewBooks", c)}
                  />
                  <SettingSwitch
                    label="Series nuevas"
                    checked={siteSettings.showBoardNewSeries}
                    onCheckedChange={(c)=>modifySiteSettings("showBoardNewSeries", c)}
                  />
                  <SettingSwitch
                    label="Series con volúmenes nuevos"
                    checked={siteSettings.showBoardRecentSeries}
                    onCheckedChange={(c)=>modifySiteSettings("showBoardRecentSeries", c)}
                  />
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-fg-muted/80">Lector</h3>
              <SettingSwitch
                label="Abrir HTML directamente"
                description="No usa el lector nativo (no se guarda progreso ni estadísticas)"
                checked={siteSettings.openHTML}
                onCheckedChange={(c)=>{
                  if (c) {
                    setOpenWarning(true);
                  } else {
                    modifySiteSettings("openHTML", false);
                  }
                }}
              />
              <SettingSwitch
                label="Iniciar cronómetro al abrir un libro"
                checked={siteSettings.autoCrono}
                onCheckedChange={(c)=>modifySiteSettings("autoCrono", c)}
              />
              <SettingSwitch
                label="Iniciar cronómetro al cambiar de página"
                checked={siteSettings.startCronoOnPage}
                onCheckedChange={(c)=>modifySiteSettings("startCronoOnPage", c)}
              />
              <SettingSwitch
                label="Mostrar indicador de cronómetro activo"
                checked={siteSettings.showCrono}
                onCheckedChange={(c)=>modifySiteSettings("showCrono", c)}
              />
              <Field label="Pausar cronómetro tras inactividad" hint="Se reanuda al cambiar de página">
                <Select
                  value={String(siteSettings.idleTimeout ?? 0)}
                  onValueChange={(v)=>modifySiteSettings("idleTimeout", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nunca</SelectItem>
                    <SelectItem value="1">1 minuto</SelectItem>
                    <SelectItem value="3">3 minutos</SelectItem>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="10">10 minutos</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-fg-muted/80">Kindle</h3>
              <p className="text-xs text-fg-muted">
                Introduce el correo generado automáticamente para tu kindle si quieres enviarte libros por
                correo electrónico. Puedes encontrarlo en Amazon &gt; Configuración &gt; Tu cuenta &gt;
                &quot;Email de Send to Kindle&quot;. Este correo solo será visible para ti.
              </p>
              <Field label="Email de Kindle">
                <Input
                  type="email"
                  value={kindleEmail}
                  onChange={(e)=>setKindleEmail(e.target.value)}
                  placeholder="nombre@kindle.com"
                />
              </Field>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveKindleEmail}>Guardar</Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={()=>{
                    setKindleEmail("");
                    modifySiteSettings("kindleEmail", undefined);
                  }}
                >
                  Borrar
                </Button>
              </div>
              <p className="text-xs text-fg-muted">
                También puedes enviar libros mediante{" "}
                <a
                  className="text-primary underline"
                  href="https://www.amazon.com/sendtokindle"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  otros métodos autorizados por Amazon
                </a>.
              </p>
            </section>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <Dialog open={openWarning} onOpenChange={setOpenWarning}>
        <DialogContent size="sm">
          <DialogTitle>¿Estás seguro?</DialogTitle>
          <DialogDescription>
            Si desactivas el lector nativo no se guardará el progreso de lo que leas ni podrás usar las
            herramientas de aprendizaje de YomiYasu.
          </DialogDescription>
          <DialogBody />
          <DialogFooter>
            <Button variant="secondary" onClick={()=>setOpenWarning(false)}>Cancelar</Button>
            <Button
              onClick={()=>{
                modifySiteSettings("openHTML", true);
                setOpenWarning(false);
              }}
            >
              Estoy seguro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
