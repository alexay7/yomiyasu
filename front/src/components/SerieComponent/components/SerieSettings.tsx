import {MoreVert} from "@mui/icons-material";
import {IconButton, Menu, MenuItem} from "@mui/material";
import React, {useState} from "react";
import {useAuth} from "../../../contexts/AuthContext";
import {SerieWithProgress} from "../../../types/serie";
import {EditSerie} from "../../../pages/Serie/components/EditSerie";
import {api} from "../../../api/api";
import {toast} from "react-toastify";

interface SerieSettingsProps {
    serieData:SerieWithProgress;
}

export function SerieSettings(props:SerieSettingsProps):React.ReactElement {
    const {serieData} = props;
    const {userData} = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [inReadlist, setInReadlist] = useState(serieData.readlist);

    function handleClick(event: React.MouseEvent<HTMLElement>):void {
        setAnchorEl(event.currentTarget);
    }

    function handleClose():void {
        setAnchorEl(null);
    }

    async function addToReadlist():Promise<void> {
        const body = {
            serie:serieData._id
        };

        try {
            await api.post<{serie:string}, {serie:string}>("readlists", body);
            toast.success(`${serieData.visibleName  } añadido a tu lista de 'Leer más tarde'`);
            setInReadlist(true);
        } catch {
            toast.error("Esta serie ya está en tu lista de 'Leer más tarde'");
        }
    }

    async function removeFromReadlist():Promise<void> {
        const body = {
            serie:serieData._id
        };

        try {
            await api.post<{serie:string}, {serie:string}>("readlists/delete", body);
            toast.success(`${serieData.visibleName  } eliminado de tu lista de 'Leer más tarde'`);
            setInReadlist(false);
        } catch {
            toast.error("Esta serie no está en tu lista de 'Leer más tarde'");
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
                {userData?.admin && (
                    <EditSerie serieData={serieData} title={`Editar ${serieData?.visibleName}`} handleClose={handleClose}/>
                )}
                {serieData.unreadBooks !== 0 && (
                    <div>
                        {inReadlist ? (
                            <MenuItem key="readlist" onClick={()=>{
                                void removeFromReadlist();
                                handleClose();
                            }}
                            >
                                Quitar de &quot;Leer más tarde&quot;
                            </MenuItem>
                        ) : (
                            <MenuItem key="readlist" onClick={()=>{
                                void addToReadlist();
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