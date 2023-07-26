import {MoreVert} from "@mui/icons-material";
import {IconButton, Menu, MenuItem} from "@mui/material";
import React, {useState} from "react";
import {useAuth} from "../../../contexts/AuthContext";
import {SerieWithProgress} from "../../../types/serie";
import {EditSerie} from "../../../pages/Serie/components/EditSerie";

interface SerieSettingsProps {
    serieData:SerieWithProgress;
}

export function SerieSettings(props:SerieSettingsProps):React.ReactElement {
    const {serieData} = props;
    const {userData} = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    function handleClick(event: React.MouseEvent<HTMLElement>):void {
        setAnchorEl(event.currentTarget);
    }

    function handleClose():void {
        setAnchorEl(null);
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
                {(serieData.status !== "readlist" && serieData.status !== "completed") && (
                    <MenuItem key="readlist" onClick={handleClose}>
                        Añadir a &quot;Leer más tarde&quot;
                    </MenuItem>
                )}
            </Menu>
        </div>
    );
}