import {Menu, Home, Book, Logout, AdminPanelSettings, History, GitHub, LightMode, DarkMode} from "@mui/icons-material";
import {Divider, IconButton, useTheme} from "@mui/material";
import React, {useContext, useEffect, useState} from "react";
import {Outlet, useNavigate} from "react-router-dom";
import {CSSTransition} from "react-transition-group";
import "./styles.css";
import {LateralListItem} from "./components/LateralListItem";
import {useAuth} from "../../contexts/AuthContext";
import {useMediaQuery} from "react-responsive";
import {SearchAutocomplete} from "./components/SearchAutocomplete";
import {Settings} from "./components/Settings";
import {AccountSettings} from "./components/AccountSettings";
import {ColorModeContext} from "../../contexts/ColorModeContext";

export function AppLayout():React.ReactElement {
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);
    const {toggleColorMode} = colorMode;
    const isTabletOrMobile = useMediaQuery({query: "(max-width: 1224px)"});

    const {userData, logoutUser} = useAuth();
    const [showMenu, setShowMenu] = useState(!isTabletOrMobile);

    const navigate = useNavigate();

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
                <div className={`bg-[#F5F5F5] dark:bg-[#272727] h-16 ${isTabletOrMobile ? "left-0" : "left-[256px]"} fixed right-0 flex px-2 items-center justify-between z-10`}>
                    <IconButton onClick={toggleMenu}>
                        <Menu className="dark:text-white p-1"/>
                    </IconButton>
                    <div className="dark:bg-[#1E1E1E] w-[95%] px-4 py-2 rounded-md shadow-gray-400 dark:shadow-gray-900 shadow-sm">
                        <SearchAutocomplete/>
                    </div>
                </div>
            </CSSTransition>

            {/* Barra lateral */}
            <CSSTransition classNames="leftbar" timeout={300} in={showMenu} unmountOnExit>
                <div className="w-[256px] bg-white dark:bg-[#363636] h-screen fixed">
                    <div className="h-16 justify-center dark:text-white flex items-center bg-[#F5F5F5] dark:bg-[#363636]">
                        <h1 className="cursor-pointer hover:text-primary duration-150" onClick={()=>navigate("/app")}>YomiYasu</h1>
                    </div>
                    <Divider/>
                    <ul className="mt-4 select-none">
                        <LateralListItem toggleMenu={toggleMenu} text="Inicio" link="/app" Icon={Home}/>
                        <LateralListItem toggleMenu={toggleMenu} text="Biblioteca" link="/app/library" Icon={Book}/>
                        <Divider className="my-4"/>
                        <LateralListItem toggleMenu={toggleMenu} text="Historial" link="/app/history" Icon={History}/>
                        <AccountSettings/>
                        <Settings/>
                        {userData?.admin && (
                            <LateralListItem toggleMenu={toggleMenu} text="Configuración" link="/app/config" Icon={AdminPanelSettings}/>
                        )}
                        <LateralListItem className="hover:bg-red-200 hover:text-black duration-150 transition-colors" text="Cerrar Sesión" Icon={Logout} onClick={()=>logoutUser()}/>
                        <Divider/>
                        {theme.palette.mode === "dark" ? (
                            <LateralListItem toggleMenu={toggleMenu} text="Activar modo claro" Icon={LightMode} onClick={()=>{
                                if (confirm("¿Estás seguro? Esta acción puede causar daños irreversibles a tu visión.")) {
                                    document.documentElement.classList.remove("dark");
                                    window.localStorage.setItem("color-theme", "light");
                                    document.documentElement.style.backgroundColor = "white";
                                    toggleColorMode();
                                }
                            }}
                            />
                        ) : (
                            <LateralListItem toggleMenu={toggleMenu} text="Activar modo oscuro" Icon={DarkMode} onClick={()=>{
                                document.documentElement.classList.add("dark");
                                window.localStorage.setItem("color-theme", "dark");
                                document.documentElement.style.backgroundColor = "#1E1E1E";
                                toggleColorMode();
                            }}
                            />
                        )}
                        <LateralListItem toggleMenu={toggleMenu} text="Reportar fallos" Icon={GitHub} onClick={()=>
                            window.open("https://github.com/alexay7/tfg/issues/new", "_blank")?.focus()}
                        />
                    </ul>
                    <div className="absolute bottom-0 left-0 p-4">
                        <a target="_blank" rel="noopener noreferrer" href="https://github.com/alexay7/tfg" className="text-gray-300 text-sm hover:no-underline hover:text-primary duration-150 transition-colors">YomiYasu {process.env.REACT_APP_VERSION}</a>
                    </div>
                </div>
            </CSSTransition>

            {/* Contenido */}
            <CSSTransition classNames="maincontent" timeout={300} in={showMenu}>
                <div className={`h-[calc(100%-4rem)] pt-[64px] ${isTabletOrMobile ? "pl-0" : "pl-[256px]"} dark:bg-[#121212]`}>
                    <Outlet/>
                </div>
            </CSSTransition>
        </div>
    );
}