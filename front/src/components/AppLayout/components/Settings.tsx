import React, {Fragment, useState} from "react";
import {PopupWindow} from "../../PopupWindow/PopupWindow";
import {LateralListItem} from "./LateralListItem";
import {Settings as SettingsIcon} from "@mui/icons-material";
import {Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControl, FormControlLabel, MenuItem, Select, TextField} from "@mui/material";
import {useSettingsStore} from "../../../stores/SettingsStore";
import {isEmail} from "class-validator";
import {toast} from "react-toastify";

export function Settings():React.ReactElement {
    const [openWarning, setOpenWarning] = useState(false);
    const {siteSettings, modifySiteSettings, openSettings, setOpenSettings} = useSettingsStore();
    const [kindleEmail, setKindleEmail] = useState(siteSettings.kindleEmail || "");

    function closePopup():void {
        setOpenSettings(false);
    }

    return (
        <Fragment>
            <LateralListItem text="Ajustes de Página" Icon={SettingsIcon} onClick={()=>setOpenSettings(true)}/>
            <PopupWindow title="Ajustes de página" open={openSettings} closePopup={closePopup} >
                <div className="flex flex-col gap-4">
                    <h2>Ajustes del lector</h2>
                    <div className="flex w-full justify-between items-center gap-4">
                        <p>¿Que tipo de medio debería salirte en el inicio?</p>
                        <Select value={siteSettings.mainView} onChange={(e)=>{
                            modifySiteSettings("mainView", e.target.value as "manga" | "novels" | "both");
                        }} className="w-1/2"
                        >
                            <MenuItem value="both">Mangas y Novelas</MenuItem>
                            <MenuItem value="manga">Solo Mangas</MenuItem>
                            <MenuItem value="novels">Solo Novelas</MenuItem>
                        </Select>
                    </div>
                    <FormControlLabel className="select-none" control={
                        <Checkbox checked={siteSettings.openHTML} onChange={(_, c)=>{
                            if (c) {
                                setOpenWarning(true);
                            } else {
                                modifySiteSettings("openHTML", false);
                            }
                        }}
                        />
                    } label="Abrir HTML directamente (no usar lector nativo)"
                    />
                    <FormControlLabel className="select-none" control={
                        <Checkbox checked={siteSettings.autoCrono} onChange={(_, c)=>{
                            modifySiteSettings("autoCrono", c);
                        }}
                        />
                    } label="Iniciar cronómetro automáticamente al abrir libro"
                    />
                    <FormControlLabel className="select-none" control={
                        <Checkbox checked={siteSettings.startCronoOnPage} onChange={(_, c)=>{
                            modifySiteSettings("startCronoOnPage", c);
                        }}
                        />
                    } label="Iniciar cronómetro automáticamente al cambiar de página"
                    />
                    <FormControlLabel className="select-none" control={
                        <Checkbox checked={siteSettings.showCrono} onChange={(_, c)=>{
                            modifySiteSettings("showCrono", c);
                        }}
                        />
                    } label="Mostrar indicador de cronómetro activo"
                    />
                    <Divider/>
                    <h2>Ajustes de YomiYasu</h2>
                    <div className="flex w-full justify-between items-center gap-4">
                        <p>¿Qué Información te interesa de cada libro?</p>
                        <Select value={siteSettings.bookView} onChange={(e)=>{
                            modifySiteSettings("bookView", e.target.value as "characters" | "pages" | "both");
                        }} className="w-1/2"
                        >
                            <MenuItem value="pages">Páginas</MenuItem>
                            <MenuItem value="characters">Caracteres</MenuItem>
                            <MenuItem value="both">Páginas y caracteres</MenuItem>
                            <MenuItem value="remainingpages">Páginas restantes</MenuItem>
                            <MenuItem value="remainingchars">Caracteres restantes</MenuItem>
                            <MenuItem value="remainingtime">Tiempo restante</MenuItem>
                        </Select>
                    </div>
                    <FormControlLabel className="select-none" control={
                        <Checkbox checked={siteSettings.antispoilers} onChange={(_, c)=>{
                            modifySiteSettings("antispoilers", c);
                        }}
                        />
                    } label="Filtro anti-spoilers"
                    />
                    <Divider/>
                    <h2>Kindle</h2>
                    <div className="flex gap-2 flex-col">
                        <ul className="text-sm mb-2 flex flex-col gap-1" >
                            <li>Introduce el correo generado automáticamente para tu kindle si quieres enviarte libros por correo electrónico,
                                este correo se puede encontrar en el menú de Configuración &gt; Tu cuenta &gt; &quot;Email de Send to Kindle&quot;.
                            </li>
                            <li>Este correo no será visible para nadie más que tú y solo se usará para enviar libros a tu kindle.</li>
                        </ul>
                        <FormControl className="w-full">
                            <TextField label="Email de Kindle" value={kindleEmail} onChange={(e)=>{
                                setKindleEmail(e.target.value);
                            }}
                            />
                        </FormControl>
                        <div className="flex gap-2 shrink-0">
                            <Button className="shrink-0" onClick={()=>{
                            // Check if it's a valid email
                                const isValid = isEmail(kindleEmail);

                                if (!isValid) {
                                    toast.error("Debes introducir un email válido");
                                    return;
                                }

                                modifySiteSettings("kindleEmail", kindleEmail);
                                toast.success("Email guardado correctamente");
                                setOpenSettings(false);
                            }} variant="outlined"
                            >Guardar
                            </Button>
                            <Button className="shrink-0" onClick={()=>{
                                setKindleEmail("");
                                modifySiteSettings("kindleEmail", undefined);
                            }} color="info" variant="outlined"
                            >Borrar
                            </Button>

                        </div>

                        <p className="text-sm">También puedes enviar libros a través de <a className="text-primary underline" href="https://www.amazon.com/sendtokindle" target="_blank" rel="noopener noreferrer">otros métodos autorizados por amazon</a>.</p>
                    </div>
                </div>
            </PopupWindow>
            <Dialog open={openWarning} onClose={()=>setOpenWarning(false)}>
                <DialogTitle>¿Estás seguro?</DialogTitle>
                <DialogContent>
                    <DialogContentText>Si desactivas el lector nativo, no se guardará el progreso de lo que leas ni podrás usar
                        las herramientas de aprendizaje de esta página
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={()=>{
                        setOpenWarning(false);
                    }}
                    >Revertir cambios
                    </Button>
                    <Button onClick={()=>{
                        modifySiteSettings("openHTML", true);
                        setOpenWarning(false);
                    }} autoFocus
                    >
                        Estoy Seguro
                    </Button>
                </DialogActions>
            </Dialog>
        </Fragment>
    );
}