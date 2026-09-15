import dayjs from "dayjs";
import "dayjs/locale/es";

/**
 * Instancia de dayjs configurada en español.
 *
 * Se importa desde este módulo (y no directamente de "dayjs") para que el
 * core y el locale vivan en el chunk compartido de las páginas que formatean
 * fechas, en lugar de cargarse en el arranque de la aplicación.
 */
dayjs.locale("es");

export type {Dayjs} from "dayjs";
export default dayjs;
