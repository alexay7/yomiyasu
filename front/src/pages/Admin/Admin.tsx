import {Check, ShieldCheck, Trash2, User} from "lucide-react";
import React, {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {toast} from "react-toastify";
import {api} from "../../api/api";
import {useAuth} from "../../contexts/AuthContext";
import {invalidateUsers} from "../../lib/invalidate";
import {keys} from "../../lib/queryKeys";
import {useTitle} from "../../lib/useTitle";
import {confirmDialog} from "../../stores/ConfirmStore";
import {LoggedUser} from "../../types/user";
import {Checkbox} from "../../ui/Checkbox";
import {EmptyState} from "../../ui/EmptyState";
import {ErrorState} from "../../ui/ErrorState";
import {Tooltip} from "../../ui/Tooltip";
import {IconButton} from "../../ui/IconButton";
import {Table, type SortDirection, type TableColumn, type TableSort} from "../../ui/Table";
import {Spinner} from "../../ui/Spinner";
import {UserCreator} from "./components/UserCreator";

interface UserRow {
    id:string;
    username:string;
    email:string;
    admin:boolean;
}

export default function Admin():React.ReactElement {
    const {userData} = useAuth();
    const [sort, setSort] = useState<TableSort | null>(null);

    useTitle("Administración");

    const isAdmin = Boolean(userData?.admin);

    const {data = [], isLoading, isError, refetch} = useQuery({
        queryKey:keys.users,
        queryFn:async()=>{
            const res = await api.get<LoggedUser[]>("users");

            if (!res) return [];

            return res.map((user)=>({
                id:user._id,
                username:user.username,
                email:user.email,
                admin:user.admin
            }));
        },
        enabled:isAdmin
    });

    const sortedRows = useMemo(()=>{
        if (!sort) return data;

        const factor = sort.direction === "asc" ? 1 : -1;

        return [...data].sort((a, b)=>{
            const left = String(a[sort.field as keyof UserRow] ?? "");
            const right = String(b[sort.field as keyof UserRow] ?? "");
            return left.localeCompare(right) * factor;
        });
    }, [data, sort]);

    async function toggleAdmin(user:UserRow, checked:boolean):Promise<void> {
        if (!await confirmDialog(`¿Estás seguro de que quieres ${checked ? "dar" : "quitar"} permisos de administrador a ${user.email}?`)) {
            return;
        }

        const res = await api.post(`users/${user.id}/admin`, {admin:checked});

        if (res) {
            invalidateUsers();
            void refetch();
        }
    }

    async function deleteUser(user:UserRow):Promise<void> {
        if (!await confirmDialog(`¿Estás seguro de que quieres eliminar a ${user.email} de la base de datos?`)) {
            return;
        }

        const res = await api.delete(`users/${user.id}`);

        if (res) {
            toast.success("Usuario eliminado");
            invalidateUsers();
            void refetch();
        }
    }

    function handleSortChange(field:string, direction:SortDirection):void {
        setSort({field, direction});
    }

    const columns:Array<TableColumn<UserRow>> = [
        {key:"username", header:"Nombre de usuario", sortable:true, render:(row)=>row.username},
        {key:"email", header:"Correo electrónico", sortable:true, render:(row)=><span className="text-fg-muted">{row.email}</span>},
        {
            key:"admin",
            header:"¿Es admin?",
            width:"8rem",
            align:"center",
            render:(row)=>(
                <span className="inline-flex justify-center">
                    <Checkbox
                        checked={row.admin}
                        disabled={row.id === userData?._id}
                        aria-label={`Permisos de administrador de ${row.username}`}
                        onCheckedChange={(checked)=>void toggleAdmin(row, checked === true)}
                    />
                </span>
            )
        },
        {
            key:"delete",
            header:"Eliminar",
            width:"6rem",
            align:"center",
            render:(row)=>(
                row.id === userData?._id ? (
                    <Tooltip content="Eres tú">
                        <span className="inline-flex justify-center text-fg-muted">
                            <User className="size-4" />
                        </span>
                    </Tooltip>
                ) : (
                    <IconButton
                        label={`Eliminar a ${row.username}`}
                        variant="danger"
                        size="sm"
                        onClick={()=>void deleteUser(row)}
                    >
                        <Trash2 />
                    </IconButton>
                )
            )
        }
    ];

    if (!userData) {
        return (
            <div className="flex justify-center py-24">
                <Spinner size={24} className="text-fg-muted" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <EmptyState
                icon={ShieldCheck}
                title="Acceso restringido"
                description="No tienes permisos de administrador."
            />
        );
    }

    if (isError) {
        return <ErrorState title="No se pudo cargar la lista de usuarios" onRetry={()=>void refetch()} />;
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-bold text-fg">Administración</h1>
                    <p className="text-sm text-fg-muted">{data.length} usuarios registrados</p>
                </div>
                <UserCreator refetch={()=>void refetch()} />
            </header>

            <Table
                columns={columns}
                rows={sortedRows}
                getRowId={(row)=>row.id}
                loading={isLoading}
                sort={sort}
                onSortChange={handleSortChange}
                empty="No hay usuarios"
            />

            <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                <Check className="size-3.5" />
                Los cambios de permisos y borrados requieren confirmación.
            </p>
        </div>
    );
}
