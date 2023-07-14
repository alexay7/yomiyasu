import {Search, Menu, Home, Book, AccountCircle, Settings, Logout, AdminPanelSettings} from "@mui/icons-material";
import {Autocomplete, Box, TextField, Divider, IconButton} from "@mui/material";
import React, {useState} from "react";
import {Outlet} from "react-router-dom";
import {CSSTransition} from "react-transition-group";
import "./styles.css";
import {LateralListItem} from "./components/LateralListItem";
import {useAuth} from "../../contexts/AuthContext";

export function AppLayout():React.ReactElement {
    const {userData, logoutUser} = useAuth();
    const [showMenu, setShowMenu] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    function toggleMenu():void {
        setShowMenu((prev)=>!prev);
    }

    return (
        <div className="h-screen">
            {/* Barra de búsqueda */}
            <CSSTransition classNames="searchbar" timeout={300} in={showMenu}>
                <div className="bg-[#272727] h-16 left-[256px] fixed right-0 flex px-4 items-center justify-around">
                    <IconButton onClick={toggleMenu}>
                        <Menu className="text-white p-1"/>
                    </IconButton>
                    <div className="bg-[#1E1E1E] w-11/12 px-4 py-2 rounded-md shadow-gray-900 shadow-sm">
                        <Autocomplete options={[{title:"Test"}, {title:"Tests"}, {title:"Tests"}, {title:"Tests"}, {title:"Tests"}, {title:"Tests"}]}
                            renderOption={(props, option)=>(
                                <Box component="li" sx={{"& > img": {mr: 2, flexShrink: 0}}} {...props}>
                                    <img width="50" src={"/api/static/yotsubato/Yotsuba-to--14/001.jpg"} alt="" />
                                    <p className="w-2/3 flex-grow">{option.title}</p>
                                </Box>
                            )}
                            renderInput={(params) => (
                                <div className="flex items-center gap-4">
                                    <Search className="text-white"/>
                                    <TextField {...params} placeholder="Buscar" variant="standard"
                                        InputProps={{...params.InputProps, disableUnderline:true}}
                                        value={searchQuery}
                                    />
                                </div>
                            )}
                            onInputChange={(e, v)=>setSearchQuery(v)}
                            isOptionEqualToValue={(option, value)=>option.title === value.title}
                            getOptionLabel={(option)=>option.title}
                            onChange={(e, v)=>{
                                // Redirigir a la página de la serie
                                console.log(v);
                            }}
                        />
                    </div>
                </div>
            </CSSTransition>

            {/* Barra lateral */}
            <CSSTransition classNames="leftbar" timeout={300} in={showMenu}>
                <div className="w-[256px] bg-[#363636] h-screen fixed">
                    <div className="h-16 justify-center text-white flex items-center">
                        <h1>YomiYasu</h1>
                    </div>
                    <Divider/>
                    <ul className="mt-4 select-none">
                        <LateralListItem text="Inicio" link="/app" Icon={Home}/>
                        <LateralListItem text="Biblioteca" link="/library" Icon={Book}/>
                        <Divider className="my-4"/>
                        <LateralListItem text="Ajustes de Cuenta" link="/account" Icon={AccountCircle}/>
                        <LateralListItem text="Ajustes" link="/settings" Icon={Settings}/>
                        {userData?.admin && (
                            <LateralListItem text="Configuración" link="/config" Icon={AdminPanelSettings}/>
                        )}
                        <LateralListItem text="Cerrar Sesión" Icon={Logout} onClick={()=>logoutUser()}/>
                    </ul>
                </div>
            </CSSTransition>

            {/* Contenido */}
            <CSSTransition classNames="maincontent" timeout={300} in={showMenu}>
                <div className="h-[calc(100vh-4rem)] pt-[64px] pl-[256px] h-100">
                    <Outlet/>
                </div>
            </CSSTransition>
        </div>
    );
}