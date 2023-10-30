import React, {Fragment, useEffect} from "react";
import {Helmet} from "react-helmet";
import {LoggedUser} from "../../types/user";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {Checkbox, IconButton, Tooltip} from "@mui/material";
import {toast} from "react-toastify";
import {useAuth} from "../../contexts/AuthContext";
import {UserCreator} from "./components/UserCreator";
import {Delete, Person} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";

export default function Admin():React.ReactElement {
    const {userData} = useAuth();

    const navigate = useNavigate();

    useEffect(()=>{
        if (userData && !userData.admin) {
            navigate("/");
        }
    }, [userData, navigate]);

    const {data = [], refetch} = useQuery("users", async()=>{
        const res = await api.get<LoggedUser[]>("users");

        if (!res) return [];

        const parsedRow = res.map((x)=>{
            return {
                id:x._id,
                username:x.username,
                email:x.email,
                admin:x.admin
            };
        });

        return parsedRow;
    });

    async function makeAdmin(user:{id:string, email:string}, checked:boolean):Promise<void> {
        if (confirm(`¿Estás seguro de que quieres ${checked ? "dar" : "quitar"} permisos de administrador a ${user.email}?`)) {
            const res = await api.post(`users/${user.id}/admin`, {admin:checked});
            if (res) {
                await refetch();
            }
            return;
        }
        toast.error("Acción cancelada");
    }

    async function deleteUser(user:{id:string, email:string}):Promise<void> {
        if (confirm(`¿Estás seguro de que quieres eliminar a ${user.email} de la base de datos?`)) {
            const res = await api.delete(`users/${user.id}`);
            if (res) {
                await refetch();
            }
            return;
        }
        toast.error("Acción cancelada");
    }

    const columns: GridColDef[] = [
        {
            field: "id",
            headerName: "Id de usuario",
            width:150
        },
        {
            field: "username",
            headerName: "Nombre de usuario",
            flex:1
        },
        {
            field: "email",
            headerName: "Correo electrónico",
            flex:2
        },
        {
            field: "admin",
            headerName: "¿Es Admin?",
            width: 100,
            sortable:false,
            filterable:false,
            renderCell:(params)=>(
                <Checkbox disabled={params.row.id === userData?._id} checked={params.value as boolean} onChange={(v, c)=>{
                    void makeAdmin(params.row, c);
                }}
                />
            )
        },
        {
            field: "delete",
            headerName: "Eliminar usuario",
            width: 150,
            sortable:false,
            filterable:false,
            renderCell:(params)=>(
                <Fragment>
                    {params.row.id === userData?._id ? (
                        <Tooltip title="Eres tú">
                            <IconButton color="info">
                                <Person/>
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <IconButton color="error" onClick={()=>{
                            void deleteUser(params.row);
                        }}
                        >
                            <Delete/>
                        </IconButton>
                    )}
                </Fragment>
            )
        }
    ];

    return (
        <div className="flex flex-col w-full dark:bg-[#121212] gap-8">
            <Helmet>
                <title>YomiYasu - Panel Admin</title>
            </Helmet>
            <div className="m-8 flex flex-col gap-4">

                <div className="flex justify-between py-4">
                    <h2 className="dark:text-white pt-2 text-2xl">Lista de usuarios</h2>
                    <UserCreator refetch={()=> void refetch()}/>
                </div>
                <DataGrid className="dark:bg-[#1E1E1E]" rows={data} columns={columns}
                    rowCount={data.length}
                    sortingMode="server"
                    disableColumnFilter
                />
            </div>
        </div>
    );
}