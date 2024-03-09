import React, {Fragment, useState} from "react";
import {PopupWindow} from "../../PopupWindow/PopupWindow";
import {LateralListItem} from "./LateralListItem";
import {Settings as SettingsIcon} from "@mui/icons-material";
import {Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, MenuItem, Select} from "@mui/material";
import {useSettingsStore} from "../../../stores/SettingsStore";

export function Settings():React.ReactElement {
    const [open, setOpen] = useState(false);
    const [openWarning, setOpenWarning] = useState(false);
    const {siteSettings, modifySiteSettings} = useSettingsStore();

    function closePopup():void {
        setOpen(false);
    }

    return (
        <Fragment>
            <LateralListItem text="Ajustes de Página" Icon={SettingsIcon} onClick={()=>setOpen(true)}/>
            <PopupWindow title="Ajustes de página" open={open} closePopup={closePopup} >
                <div className="flex flex-col gap-4">
                    <FormControlLabel className="select-none" control={
                        <Checkbox checked={siteSettings.openHTML} onChange={(e, c)=>{
                            if (c) {
                                setOpenWarning(true);
                            } else {
                                modifySiteSettings("openHTML", false);
                            }
                        }}
                        />
                    } label="Abrir HTML directamente (no usar lector nativo)"
                    />
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
                        <Checkbox checked={siteSettings.autoCrono} onChange={(e, c)=>{
                            modifySiteSettings("autoCrono", c);
                        }}
                        />
                    } label="Iniciar cronómetro automáticamente al abrir libro"
                    />
                    <FormControlLabel className="select-none" control={
                        <Checkbox checked={siteSettings.startCronoOnPage} onChange={(e, c)=>{
                            modifySiteSettings("startCronoOnPage", c);
                        }}
                        />
                    } label="Iniciar cronómetro automáticamente al cambiar de página"
                    />
                    <FormControlLabel className="select-none" control={
                        <Checkbox checked={siteSettings.antispoilers} onChange={(e, c)=>{
                            modifySiteSettings("antispoilers", c);
                        }}
                        />
                    } label="Filtro anti-spoilers"
                    />
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