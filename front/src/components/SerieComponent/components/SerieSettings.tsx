import {MoreVert} from "@mui/icons-material";
import {IconButton, Menu, MenuItem} from "@mui/material";
import React, {useState} from "react";
import {useAuth} from "../../../contexts/AuthContext";
import {SerieWithProgress} from "../../../types/serie";
import {EditSerie} from "../../EditSerie/EditSerie";
import {useGlobal} from "../../../contexts/GlobalContext";
import {addToReadlist, removeFromReadlist} from "../../../helpers/series";
import {iBook} from "../../../helpers/book";
import {api} from "../../../api/api";
import { toast } from "react-toastify";

interface SerieSettingsProps {
    serieData:SerieWithProgress;
    unreadBooks:number;
    setUnreadBooks:(v:React.SetStateAction<number>)=>void
}

export function SerieSettings(props:SerieSettingsProps):React.ReactElement {
    const {serieData, unreadBooks, setUnreadBooks} = props;
    const {userData} = useAuth();
    const {forceReload} = useGlobal();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    function handleClick(event: React.MouseEvent<HTMLElement>):void {
        setAnchorEl(event.currentTarget);
    }

    function handleClose():void {
        setAnchorEl(null);
    }

    async function setNames():Promise<void> {
        await api.patch<unknown, {status:string}>(`series/${serieData._id}/defaultname`, {});
        forceReload("all");
    }

    async function markAsRead():Promise<void> {
        await api.post<unknown, {status:string}>(`readprogress/${serieData._id}`, {});
        forceReload("all");
        setUnreadBooks(0);
    }

    async function pauseSerie():Promise<void> {
        await api.post<unknown, {status:string}>(`serieprogress/pause/${  serieData._id  }`, {});
        forceReload("all");
    }

    async function resumeSerie():Promise<void> {
        await api.post<unknown, {status:string}>(`serieprogress/resume/${  serieData._id  }`, {});
        forceReload("all");
    }

    async function zipSerie():Promise<void> {
     const response =   await api.post<void, {status:string}>(`series/${serieData._id}/zip`);

        if (response) {
            toast.success("Serie comprimida con éxito");
        }   
    }

    return (
        <div className="">
            <IconButton className="text-center" onClick={(e)=>{
                handleClick(e);
            }}
            >
                <MoreVert className="w-6 h-6"/>
            </IconButton>
            <Menu id="long-menu" keepMounted anchorEl={anchorEl}
                open={Boolean(anchorEl)} onClose={handleClose} disableScrollLock={true}
            >
                <MenuItem
                    onClick={()=>{
                        void iBook(serieData);
                    }}
                >Leer siguiente volumen
                </MenuItem>
                {serieData.paused ? (
                    <MenuItem onClick={()=>{
                        void resumeSerie();
                    }}
                    >
                        Reanudar serie
                    </MenuItem>
                ) : (
                    <MenuItem onClick={()=>{
                        void pauseSerie();
                    }}
                    >
                        Pausar serie
                    </MenuItem>
                )}
                {unreadBooks > 0 && (
                    <MenuItem
                        onClick={()=>{
                            void markAsRead();
                        }}
                    >Marcar serie como leída
                    </MenuItem>
                )}
                {userData?.admin && (
                    <EditSerie serieData={serieData} handleClose={handleClose}/>
                )}
                {userData?.admin && (
                    <MenuItem key="automatic" onClick={setNames}>Aplicar nombres automáticos</MenuItem>
                )}
                {userData?.admin && (
                    <MenuItem key="zip" onClick={zipSerie}>Comprimir serie</MenuItem>
                )}
                {unreadBooks !== 0 && (
                    <div>
                        {serieData.readlist ? (
                            <MenuItem key="readlist" onClick={()=>{
                                void removeFromReadlist(serieData._id, serieData.visibleName);
                                forceReload("readlist");
                                handleClose();
                            }}
                            >
                                Quitar de &quot;Leer más tarde&quot;
                            </MenuItem>
                        ) : (
                            <MenuItem key="readlist" onClick={()=>{
                                void addToReadlist(serieData._id, serieData.visibleName);
                                forceReload("readlist");
                                handleClose();
                            }}
                            >
                                Añadir a &quot;Leer más tarde&quot;
                            </MenuItem>
                        )}
                    </div>
                )}
            </Menu>
        </div>
    );
}