import {gql, request} from "graphql-request";
import {DownloadCloud} from "lucide-react";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {toast} from "react-toastify";
import {api} from "../../api/api";
import {invalidateSerie} from "../../lib/invalidate";
import {keys} from "../../lib/queryKeys";
import {AnilistGenres, AnilistSerie, AnilistStatus, type Serie, type SerieWithProgress} from "../../types/serie";
import {Button} from "../../ui/Button";
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "../../ui/Dialog";
import {Field} from "../../ui/Field";
import {IconButton} from "../../ui/IconButton";
import {Input} from "../../ui/Input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../ui/Select";
import {TagInput} from "../../ui/TagInput";
import {Textarea} from "../../ui/Textarea";
import {Tooltip} from "../../ui/Tooltip";

interface EditSerieDialogProps {
  serie: SerieWithProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function getAnilistData(title:string, variant:"manga" | "novela", apply:{
  setName: (value: string) => void;
  setSortName: (value: string) => void;
  setSummary: (value: string) => void;
  setStatus: (value: string) => void;
  setGenres: (value: string[]) => void;
  setAuthors: (value: string[]) => void;
  setAlternativeNames: (value: string[]) => void;
}):Promise<void> {
  const query = gql`
    query($query:String, $format:MediaFormat){
        Media(search:$query, format: $format, type: MANGA){
            status
            description
            genres
            synonyms
            title {
                romaji
                english
                native
            }
            staff {
                edges {
                    role
                    node {
                        name {
                            native
                            full
                        }
                    }
                }
            }
        }
    }
    `;

  const response = await request<AnilistSerie>("https://graphql.anilist.co", query, {
    query:title,
    format:variant === "manga" ? "MANGA" : "NOVEL"
  });

  const data = response.Media;
  const alternativeNames: string[] = [];

  if (data.title) {
    apply.setName(data.title.native || data.title.romaji);

    if (data.title.english) alternativeNames.push(data.title.english);

    if (data.title.romaji) {
      alternativeNames.push(data.title.romaji);
      apply.setSortName(data.title.romaji);
    }
  }

  if (data.description) apply.setSummary(data.description);

  if (data.status) {
    apply.setStatus(AnilistStatus[data.status]);
  }

  if (data.genres) {
    const genres = data.genres.map((genre)=>AnilistGenres[genre]).filter((genre)=>!!genre);
    apply.setGenres(genres);
  }

  if (data.staff) {
    const authors = data.staff.edges
      .filter((edge)=>edge.role.toLowerCase().includes("story") || edge.role.toLowerCase().includes("art"))
      .map((edge)=>edge.node.name.native || edge.node.name.full)
      .filter((author)=>!!author);

    apply.setAuthors(authors);
  }

  if (data.synonyms) {
    alternativeNames.push(...data.synonyms);
  }

  if (alternativeNames.length > 0) {
    apply.setAlternativeNames(Array.from(new Set(alternativeNames)));
  }
}

export function EditSerieDialog({serie, open, onOpenChange}:EditSerieDialogProps):React.ReactElement {
  const [name, setName] = useState(serie.visibleName);
  const [sortName, setSortName] = useState(serie.sortName);
  const [summary, setSummary] = useState(serie.summary ?? "");
  const [status, setStatus] = useState(serie.status || "");
  const [genres, setGenres] = useState(serie.genres);
  const [authors, setAuthors] = useState(serie.authors);
  const [alternativeNames, setAlternativeNames] = useState(serie.alternativeNames || []);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const {data:genresAndArtists = {genres:[], authors:[]}} = useQuery({
    queryKey:keys.genresAndArtists,
    queryFn:async()=>{
      return api.get<{genres:string[], authors:string[]}>("series/genresAndArtists");
    },
    enabled:open
  });

  async function importFromAnilist():Promise<void> {
    setImporting(true);

    try {
      await getAnilistData(name, serie.variant, {
        setName, setSortName, setSummary, setStatus, setGenres, setAuthors, setAlternativeNames
      });
      toast.success("Datos importados desde AniList");
    } catch {
      toast.error("No se pudieron importar los datos de AniList");
    } finally {
      setImporting(false);
    }
  }

  async function save():Promise<void> {
    if (name === "" || sortName === "") {
      toast.error("Rellena todos los campos obligatorios");
      return;
    }

    const body:Partial<Serie> = {
      visibleName:name,
      sortName,
      summary,
      status,
      genres,
      authors,
      alternativeNames
    };

    setSaving(true);

    try {
      const response = await api.patch<Partial<Serie>, Serie>(`series/${serie._id}`, body);

      if (response) {
        toast.success(`Datos de ${name} actualizados con éxito`);
        onOpenChange(false);
        invalidateSerie(serie._id);
      }
    } catch {
      toast.error("No tienes permisos para realizar esa acción");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={(e)=>{
            e.preventDefault();
            void save();
          }}
        >
          <DialogHeader>
            <DialogTitle>Editar serie</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div className="flex items-end gap-2">
              <Field label="Nombre" htmlFor="editserie-name" className="flex-1">
                <Input id="editserie-name" required value={name} onChange={(e)=>setName(e.target.value)} />
              </Field>
              <Tooltip content="Importar datos desde AniList (por nombre)">
                <IconButton label="Importar desde AniList" variant="solid" loading={importing} onClick={()=>void importFromAnilist()}>
                  <DownloadCloud />
                </IconButton>
              </Tooltip>
            </div>
            <Field label="Nombre para ordenar" htmlFor="editserie-sortname">
              <Input id="editserie-sortname" required value={sortName} onChange={(e)=>setSortName(e.target.value)} />
            </Field>
            <Field label="Resumen" htmlFor="editserie-summary">
              <Textarea id="editserie-summary" value={summary} onChange={(e)=>setSummary(e.target.value)} rows={5} />
            </Field>
            <Field label="Estado">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENDED">Finalizado</SelectItem>
                  <SelectItem value="PUBLISHING">En progreso</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Géneros" hint="Enter o coma para añadir">
              <TagInput
                value={genres}
                onChange={setGenres}
                suggestions={genresAndArtists.genres}
                placeholder="Añadir género…"
              />
            </Field>
            <Field label="Autores" hint="Enter o coma para añadir">
              <TagInput
                value={authors}
                onChange={setAuthors}
                suggestions={genresAndArtists.authors}
                placeholder="Añadir autor…"
              />
            </Field>
            <Field label="Nombres alternativos" hint="Enter o coma para añadir">
              <TagInput value={alternativeNames} onChange={setAlternativeNames} placeholder="Añadir nombre…" />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={()=>onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
