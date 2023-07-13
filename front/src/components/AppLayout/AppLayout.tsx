import {Search} from "@mui/icons-material";
import {Autocomplete, Box, TextField, Divider} from "@mui/material";
import React from "react";
import {Outlet} from "react-router-dom";

export function AppLayout():React.ReactElement {
    return (
        <div className="h-screen">
            {/* Barra de búsqueda */}
            <div className="bg-gray-600 h-16 left-[256px] fixed right-0 flex justify-end px-4 items-center">
                <div className="bg-gray-700 w-11/12 px-4 py-2 rounded-sm shadow-gray-800 shadow-sm">
                    <Autocomplete options={[{title:"Test"}, {title:"Tests"}, {title:"Tests"}, {title:"Tests"}, {title:"Tests"}, {title:"Tests"}]}
                        renderOption={(props, option)=>(
                            <Box component="li" sx={{"& > img": {mr: 2, flexShrink: 0}}} {...props}
                                onClick={()=>window.location.href = `/app/${option.title}`}
                            >
                                <img width="50" src="http://localhost/api/static/yotsubato/Yotsuba-to--14/001.jpg" alt="" />
                                <p className="w-2/3 flex-grow">{option.title}</p>
                            </Box>
                        )}
                        renderInput={(params) => (
                            <div className="flex items-center gap-4">
                                <Search className="text-white"/>
                                <TextField {...params} placeholder="Buscar" variant="standard"/>
                            </div>
                        )}
                        isOptionEqualToValue={(option, value)=>option.title === value.title}
                        getOptionLabel={(option)=>option.title}
                    />
                </div>
            </div>

            {/* Barra lateral */}
            <div className="w-[256px] bg-gray-700 h-screen fixed">
                <div className="h-40"/>
                <Divider/>
                <ul>
                    <li>Inicio</li>
                </ul>
            </div>

            {/* Contenido */}
            <div className="h-[calc(100vh-4rem)] pt-[64px] pl-[256px] h-100">
                <Outlet/>
            </div>
        </div>
    );
}