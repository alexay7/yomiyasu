import {Trash2} from "lucide-react";
import {useNavigate} from "react-router";
import {toast} from "react-toastify";
import {api} from "../../../api/api";
import {CoverImage} from "../../../components/CoverImage";
import {formatTime} from "../../../helpers/helpers";
import {confirmDialog} from "../../../stores/ConfirmStore";
import type {BookProgress} from "../../../types/book";
import {Badge} from "../../../ui/Badge";
import {IconButton} from "../../../ui/IconButton";
import {Pagination} from "../../../ui/Pagination";
import {Table, type SortDirection, type TableColumn, type TableSort} from "../../../ui/Table";

export interface LogData {
  id:string;
  bookId:string;
  image:string;
  book:string;
  serie:string;
  tipo:string;
  status:string;
  currentPage:number;
  startDate?:Date;
  endDate?:Date | null;
  time:number;
  lastUpdateDate?:Date;
  characters:number;
}

interface LogTableProps {
  data:LogData[];
  loading:boolean;
  refetch:()=>void;
  /** Se llama al copiar el log de una fila. */
  onCopied?:()=>void;
  /** Paginación servidor (opcional). */
  sort?:TableSort | null;
  onSortChange?:(field:string, direction:SortDirection)=>void;
  page?:number;
  pages?:number;
  onPageChange?:(page:number)=>void;
}

function formatDate(value?:Date | null):string {
  return value ? new Date(value).toLocaleString() : "—";
}

function statusVariant(status:string):"success" | "primary" | "neutral" {
  if (status === "completed") return "success";
  if (status === "reading") return "primary";
  return "neutral";
}

export function LogTable({data, loading, refetch, onCopied, sort, onSortChange, page, pages, onPageChange}:LogTableProps):React.ReactElement {
  const navigate = useNavigate();

  async function deleteProgress(id:string):Promise<void> {
    const res = await api.delete<BookProgress>(`readprogress/${id}`);

    if (res) {
      toast.success("Progreso borrado con éxito");
      refetch();
    }
  }

  function copyLog(row:LogData):void {
    let text = `.log manga ${row.currentPage} ${row.book}`;

    if (row.tipo === "novela") {
      text = `.log lectura ${row.characters} ${row.book}`;
    }

    if (row.time > 59) {
      text += `;${Math.floor(row.time / 60)}`;
    }

    if (row.characters > 0 && row.tipo === "manga") {
      text += `&${row.characters}`;
    }

    void navigator.clipboard.writeText(text);
    onCopied?.();
  }

  const columns:Array<TableColumn<LogData>> = [
    {
      key:"delete",
      header:"",
      width:"3rem",
      render:(row)=>(
        <IconButton
          label="Borrar progreso"
          variant="danger"
          size="sm"
          onClick={async(e)=>{
            e.stopPropagation();
            if (await confirmDialog("¿Seguro que quieres borrar el progreso?")) {
              window.localStorage.removeItem(row.bookId);
              void deleteProgress(row.id);
            }
          }}
        >
          <Trash2 />
        </IconButton>
      ),
    },
    {
      key:"image",
      header:"",
      width:"4.5rem",
      render:(row)=>(
        <CoverImage
          className="h-14 w-10 cursor-pointer rounded-sm object-cover"
          loading="lazy"
          decoding="async"
          src={row.image}
          alt=""
          onClick={async(e)=>{
            e.stopPropagation();
            if (!await confirmDialog("¿Seguro que quieres abrir el libro?")) return;
            navigate(`/reader/${row.bookId}`);
          }}
        />
      ),
    },
    {key:"book", header:"Libro", sortField:"book", sortable:true, render:(row)=><span className="line-clamp-1">{row.book}</span>},
    {key:"serie", header:"Serie", sortField:"serie", sortable:true, render:(row)=><span className="line-clamp-1 text-fg-muted">{row.serie}</span>},
    {
      key:"tipo",
      header:"Tipo",
      width:"6rem",
      render:(row)=><span className="text-fg-muted">{row.tipo === "manga" ? "Manga" : "Novela"}</span>,
    },
    {
      key:"status",
      header:"Estado",
      width:"8rem",
      render:(row)=>(
        <Badge variant={statusVariant(row.status)}>
          {row.status === "completed" ? "Completado" : row.status === "reading" ? "En progreso" : "Sin empezar"}
        </Badge>
      ),
    },
    {key:"currentPage", header:"Páginas", sortField:"currentPage", sortable:true, align:"right", width:"6rem", render:(row)=>row.currentPage},
    {key:"characters", header:"Caracteres", align:"right", width:"7rem", render:(row)=>row.characters.toLocaleString()},
    {key:"time", header:"Tiempo", sortField:"time", sortable:true, align:"right", width:"6.5rem", render:(row)=>formatTime(row.time)},
    {key:"lastUpdateDate", header:"Actualizado", sortField:"lastUpdateDate", sortable:true, width:"11rem", render:(row)=>formatDate(row.lastUpdateDate)},
    {key:"startDate", header:"Inicio", sortField:"startDate", sortable:true, width:"11rem", render:(row)=>formatDate(row.startDate)},
    {key:"endDate", header:"Fin", width:"11rem", render:(row)=>formatDate(row.endDate)},
  ];

  return (
    <div className="flex flex-col gap-3">
      <Table
        columns={columns}
        rows={data}
        getRowId={(row)=>row.id}
        loading={loading}
        sort={sort}
        onSortChange={onSortChange}
        onRowClick={copyLog}
        empty="No hay registros de lectura"
      />

      {onPageChange && pages && pages > 1 ? (
        <div className="flex justify-center">
          <Pagination page={page ?? 1} pages={pages} onPageChange={onPageChange} />
        </div>
      ) : null}

      {data.length > 0 ? (
        <p className="text-center text-[11px] text-fg-muted">
          Haz click en una fila para copiar el log de lectura
        </p>
      ) : null}
    </div>
  );
}
