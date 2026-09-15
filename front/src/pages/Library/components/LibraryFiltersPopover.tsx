import {SlidersHorizontal, X} from "lucide-react";
import {Badge} from "../../../ui/Badge";
import {Button} from "../../../ui/Button";
import {Checkbox} from "../../../ui/Checkbox";
import {Field} from "../../../ui/Field";
import {Input} from "../../../ui/Input";
import {Popover, PopoverContent, PopoverTrigger} from "../../../ui/Popover";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../../ui/Select";
import {Separator} from "../../../ui/Separator";
import {Slider} from "../../../ui/Slider";
import type {LibraryFilters} from "../../../lib/useLibraryFilters";
import {activeFilterCount, sortOptions} from "./libraryFilterUtils";

interface LibraryFiltersPopoverProps {
  filters: LibraryFilters;
  setFilter: (key: keyof Omit<LibraryFilters, "page">, value: string | number | boolean | null) => void;
  clearFilters: () => void;
  genres: string[];
  authors: string[];
}

export function LibraryFiltersPopover({filters, setFilter, clearFilters, genres, authors}:LibraryFiltersPopoverProps):React.ReactElement {
  const count = activeFilterCount(filters);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          icon={<SlidersHorizontal className="size-3.5" />}
          trailingIcon={count > 0 ? <Badge variant="primary" className="ml-0.5">{count}</Badge> : undefined}
        >
          Filtros
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e)=>{
            e.preventDefault();
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-fg">Filtrar y ordenar</p>
            {count > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters} icon={<X className="size-3.5" />}>
                Limpiar
              </Button>
            ) : null}
          </div>

          <Field label="Ordenar por">
            <Select value={filters.sortBy} onValueChange={(v)=>setFilter("sortBy", v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option)=>(
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Separator />

          <Field label={`Dificultad: ${filters.min} – ${filters.max}`}>
            <Slider
              value={[filters.min, filters.max]}
              min={0}
              max={10}
              step={1}
              onValueCommit={(values)=>{
                setFilter("min", values[0]);
                setFilter("max", values[1]);
              }}
            />
          </Field>

          <Field label="Estado de publicación">
            <Select value={filters.status ?? "all"} onValueChange={(v)=>setFilter("status", v === "all" ? null : v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="ENDED">Finalizada</SelectItem>
                <SelectItem value="PUBLISHING">En publicación</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Estado de lectura">
            <Select value={filters.readProgress} onValueChange={(v)=>setFilter("readProgress", v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="reading">En progreso</SelectItem>
                <SelectItem value="unread">Sin empezar</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Género" htmlFor="filter-genre">
            <Input
              id="filter-genre"
              list="filter-genre-options"
              size="sm"
              value={filters.genre ?? ""}
              onChange={(e)=>setFilter("genre", e.target.value)}
              placeholder="Cualquiera"
            />
            <datalist id="filter-genre-options">
              {genres.map((genre)=>(
                <option key={genre} value={genre} />
              ))}
            </datalist>
          </Field>

          <Field label="Autor" htmlFor="filter-author">
            <Input
              id="filter-author"
              list="filter-author-options"
              size="sm"
              value={filters.author ?? ""}
              onChange={(e)=>setFilter("author", e.target.value)}
              placeholder="Cualquiera"
            />
            <datalist id="filter-author-options">
              {authors.map((author)=>(
                <option key={author} value={author} />
              ))}
            </datalist>
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 py-1">
            <Checkbox checked={filters.readlist} onCheckedChange={(checked)=>setFilter("readlist", checked === true)} />
            <span className="text-sm text-fg">Solo en “Leer más tarde”</span>
          </label>
        </form>
      </PopoverContent>
    </Popover>
  );
}

