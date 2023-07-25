import {Menu, Home, Book, AccountCircle, Settings, Logout, AdminPanelSettings} from "@mui/icons-material";
import {Divider, IconButton} from "@mui/material";
import React, {useEffect, useState} from "react";
import {Outlet} from "react-router-dom";
import {CSSTransition} from "react-transition-group";
import "./styles.css";
import {LateralListItem} from "./components/LateralListItem";
import {useAuth} from "../../contexts/AuthContext";
import {useMediaQuery} from "react-responsive";
import {SearchAutocomplete} from "./components/SearchAutocomplete";

export function AppLayout():React.ReactElement {
    const isTabletOrMobile = useMediaQuery({query: "(max-width: 1224px)"});

    const {userData, logoutUser} = useAuth();
    const [showMenu, setShowMenu] = useState(!isTabletOrMobile);

    useEffect(()=>{
        setShowMenu(!isTabletOrMobile);
    }, [isTabletOrMobile, setShowMenu]);

    function toggleMenu():void {
        setShowMenu((prev)=>!prev);
    }

    return (
        <div className="h-screen">
            {/* Barra de búsqueda */}
            <CSSTransition classNames="searchbar" timeout={300} in={showMenu}>
                <div className={`bg-[#272727] h-16 ${isTabletOrMobile ? "left-0" : "left-[256px]"} fixed right-0 flex px-2 items-center justify-between z-10`}>
                    <IconButton onClick={toggleMenu}>
                        <Menu className="text-white p-1"/>
                    </IconButton>
                    <div className="bg-[#1E1E1E] w-[95%] px-4 py-2 rounded-md shadow-gray-900 shadow-sm">
                        <SearchAutocomplete/>
                    </div>
                </div>
            </CSSTransition>

            {/* Barra lateral */}
            <CSSTransition classNames="leftbar" timeout={300} in={showMenu} unmountOnExit>
                <div className="w-[256px] bg-[#363636] h-screen fixed">
                    <div className="h-16 justify-center text-white flex items-center">
                        <h1 className="cursor-pointer hover:text-primary duration-150" onClick={()=>window.location.href = "/app"}>YomiYasu</h1>
                    </div>
                    <Divider/>
                    <ul className="mt-4 select-none">
                        <LateralListItem text="Inicio" link="/app" Icon={Home}/>
                        <LateralListItem text="Biblioteca" link="/app/library" Icon={Book}/>
                        <Divider className="my-4"/>
                        <LateralListItem text="Ajustes de Cuenta" link="/app/account" Icon={AccountCircle}/>
                        <LateralListItem text="Ajustes" link="/app/settings" Icon={Settings}/>
                        {userData?.admin && (
                            <LateralListItem text="Configuración" link="/app/config" Icon={AdminPanelSettings}/>
                        )}
                        <LateralListItem text="Cerrar Sesión" Icon={Logout} onClick={()=>logoutUser()}/>
                    </ul>
                </div>
            </CSSTransition>

            {/* Contenido */}
            <CSSTransition classNames="maincontent" timeout={300} in={showMenu}>
                <div className={`h-[calc(100vh-4rem)] pt-[64px] ${isTabletOrMobile ? "pl-0" : "pl-[256px]"} bg-[#121212]`}>
                    <Outlet/>
                </div>
            </CSSTransition>
        </div>
    );
}