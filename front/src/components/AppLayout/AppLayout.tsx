import {Menu, Home, Book, Logout, AdminPanelSettings, History, GitHub, LightMode, DarkMode, PieChart, CalendarMonth, List} from "@mui/icons-material";
import {Divider, IconButton, useTheme} from "@mui/material";
import React, {Fragment, useContext, useEffect, useState} from "react";
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
        <div className="h-[100svh]">
            {/* Barra de búsqueda */}
            <CSSTransition classNames="searchbar" timeout={300} in={showMenu}>
                <div className={`bg-[#EBE8E3] dark:bg-[#101010] h-16 ${isTabletOrMobile ? "left-0" : "left-[270px]"} fixed right-0 flex px-2 items-center justify-between z-10 gap-2`}>
                    <IconButton onClick={toggleMenu}>
                        <Menu className="dark:text-white p-1"/>
                    </IconButton>
                    <div className="dark:bg-[#1E1E1E] w-[95%] px-4 py-2 rounded-md shadow-gray-400 dark:shadow-gray-900 shadow-sm bg-white">
                        <SearchAutocomplete/>
                    </div>
                </div>
            </CSSTransition>

            {/* Barra lateral */}
            <CSSTransition classNames="leftbar" timeout={300} in={showMenu} unmountOnExit>
                <div className="w-[270px] bg-[#f7f7f7] dark:bg-[#212121] h-[100svh] fixed">
                    <div className="h-16 justify-center dark:text-white flex items-center bg-[#EBE8E3] dark:bg-[#101010]">
                        <h1 className="cursor-pointer hover:text-primary duration-150" onClick={()=>navigate("/app")}>YomiYasu</h1>
                    </div>
                    <Divider/>
                    <ul className="mt-4 select-none h-[calc(100vh-8rem)] overflow-y-auto">
                        <LateralListItem toggleMenu={toggleMenu} text="Inicio" link="/app" Icon={Home}/>
                        <LateralListItem toggleMenu={toggleMenu} text="Biblioteca" link="/app/library" Icon={Book}/>
                        <Divider className="my-4"/>
                        <LateralListItem category toggleMenu={toggleMenu} text="Historial" link="/app/history" Icon={History}/>
                        <Fragment>
                            <LateralListItem sub toggleMenu={toggleMenu} text="Lista" link="/app/history" Icon={List}/>
                            <LateralListItem sub toggleMenu={toggleMenu} text="Calendario" link="/app/calendar" Icon={CalendarMonth}/>
                        </Fragment>
                        <LateralListItem toggleMenu={toggleMenu} text="Estadísticas" link="/app/profile" Icon={PieChart}/>
                        <AccountSettings/>
                        <Settings/>
                        {userData?.admin && (
                            <LateralListItem toggleMenu={toggleMenu} text="Configuración" link="/app/admin" Icon={AdminPanelSettings}/>
                        )}
                        <LateralListItem className="hover:bg-red-200 hover:text-black duration-150 transition-colors" text="Cerrar Sesión" Icon={Logout} onClick={()=>logoutUser()}/>
                        <Divider/>
                        {theme.palette.mode === "dark" ? (
                            <LateralListItem toggleMenu={toggleMenu} text="Activar modo claro" Icon={LightMode} onClick={()=>{
                                document.documentElement.classList.remove("dark");
                                window.localStorage.setItem("color-theme", "light");
                                document.documentElement.style.backgroundColor = "white";
                                toggleColorMode();
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
                            window.open("https://github.com/alexay7/yomiyasu/issues/new", "_blank")?.focus()}
                        />
                    </ul>
                    <div className="absolute bottom-0 left-0 p-4">
                        <a target="_blank" rel="noopener noreferrer" href="https://github.com/alexay7/yomiyasu" className="text-gray-300 text-sm hover:no-underline hover:text-primary duration-150 transition-colors">YomiYasu {process.env.REACT_APP_VERSION}</a>
                    </div>
                </div>
            </CSSTransition>

            {/* Contenido */}
            <CSSTransition classNames="maincontent" timeout={300} in={showMenu}>
                <div className={`h-[calc(100svh-4rem)] pt-16 ${isTabletOrMobile ? "pl-0" : "pl-[270px]"} dark:bg-[#121212] bg-[#ebe8e3]`}>
                    <Divider/>
                    <Outlet/>
                </div>
            </CSSTransition>
        </div>
    );
}