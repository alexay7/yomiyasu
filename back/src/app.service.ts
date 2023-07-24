import {Injectable, Logger} from "@nestjs/common";
import {SeriesService} from "./series/series.service";
import {Cron} from "@nestjs/schedule";
import {join, extname} from "path";
import * as fs from "fs";
import {BooksService} from "./books/books.service";
import {extractUrlFromHtml} from "./books/helpers/helpers";
import {WebsocketsGateway} from "./websockets/websockets.gateway";

@Injectable()
export class AppService {
    constructor(
        private readonly seriesService: SeriesService,
        private readonly booksService: BooksService,
        private readonly websocketsGateway:WebsocketsGateway
    ) {}
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
      return "Hello World!";
  }

  /**
   * Este cronjob escanea todos los archivos dentro de la
   * biblioteca de archivos siguiendo la siguiente estructura
   *
   * /root/{nombreserie}/{nombrelibro}.html
   *
   * Se crearán la serie y los libros definidos en el nombre de los
   * archivos y esta será la clave que los identifique.
   *
   * Si se cambia el nombre del archivo/carpeta o es borrado,
   * será marcado como "missing" en la base de datos. Estos elementos
   * aparecerán en el panel de administrador de la web donde tendrán
   * la opción de borrar el elemento directamente.
   * La otra opción que tendrá es restaurar el elemento con el
   * mismo nombre para que se le quite la propiedad "missing"
   */
  @Cron("0 0 3 * * *")
  async testing() {
      this.logger.log("\x1b[34mEscaneando biblioteca...");
      const existingFolders: string[] = [];
      const existingBooks: {
          seriePath: string;
          bookName: string;
          bookPath?: string;
      }[] = [];
      const mainFolderPath = join(process.cwd(), "..", "exterior");
      let areChanges = false;

      const items = fs.readdirSync(mainFolderPath);

      // Escanea directorios y archivos html
      items.forEach((item) => {
          const itemPath = join(mainFolderPath, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory()) {
              existingFolders.push(item);

              const subItems = fs.readdirSync(itemPath);
              const existingBooksInSubfolder = subItems.filter(
                  (subItem) => extname(subItem) === ".html"
              );
              existingBooksInSubfolder.forEach((foundBook) => {
                  existingBooks.push({
                      seriePath: item,
                      bookName: foundBook.replace(".html", ""),
                      bookPath: join(itemPath, foundBook)
                  });
              });
          }
      });

      // INICIO PROCESO DE SERIES
      // Busca todas las series no marcadas como desaparecidas de la base de datos
      const savedFolders = (await this.seriesService.findNonMissing()).map(
          (item) => item.path
      );

      // Filtra las series nuevas
      const foldersToAddInDb = existingFolders.filter(
          (value) => !savedFolders.includes(value)
      );

      // Filtra las series a marcar como borradas
      const foldersToMarkAsDeleted = savedFolders.filter(
          (value) => !existingFolders.includes(value)
      );

      // Añade las series nuevas a la base de datos
      if (foldersToAddInDb.length > 0) {
          this.logger.log("\x1b[34mEncontradas series nuevas");
          areChanges = true;
          foldersToAddInDb.forEach(async(elem) => {
              const newSeries = {
                  path: elem,
                  visibleName: elem,
                  sortName: elem
              };
              await this.seriesService.updateOrCreate(newSeries);
          });
      }

      // Marca las series no encontradas como desaparecidas
      if (foldersToMarkAsDeleted.length > 0) {
          this.logger.log("\x1b[34mEncontradas series desaparecidas");
          areChanges = true;
          foldersToMarkAsDeleted.forEach(async(elem) => {
              await this.seriesService.markAsMissing(elem);
          });
      }
      // FIN PROCESO DE SERIES

      // INICIO PROCESO DE LIBROS
      // Busca todos los libros no marcados como desaparecidos de la base de datos
      const savedBooks = (await this.booksService.findNonMissing()).map(
          (item) => {
              return {
                  bookName: item.path,
                  seriePath: item.serie
              };
          }
      );

      // Filtra los libros nuevos
      const booksToAddInDb = existingBooks.filter(
          (value) =>
              !savedBooks.map((elem) => elem.bookName).includes(value.bookName)
      );

      // Filtra los libros a marcar como borrados
      const booksToMarkAsDeleted = savedBooks.filter(
          (value) =>
              !existingBooks.map((elem) => elem.bookName).includes(value.bookName)
      );

      // Añade los libros nuevos a la base de datos
      if (booksToAddInDb.length > 0) {
          this.logger.log("\x1b[34mEncontrados libros nuevos");
          areChanges = true;

          booksToAddInDb.forEach(async(elem) => {
              if (elem.bookPath) {
                  const imagesFolder = extractUrlFromHtml(elem.bookPath);

                  if (imagesFolder) {
                      const foundSerie = await this.seriesService.getIdFromPath(elem.seriePath);

                      const newBook = {
                          path: elem.bookName,
                          visibleName: elem.bookName,
                          sortName: elem.bookName,
                          imagesFolder: imagesFolder.folderName,
                          serie: foundSerie,
                          seriePath:elem.seriePath,
                          thumbnailPath: imagesFolder.thumbnailPath,
                          pages: imagesFolder.totalImages
                      };
                      await this.booksService.updateOrCreate(newBook);
                  }
              }
          });
      }

      // Marca los libros no encontrados como desaparecidos
      if (booksToMarkAsDeleted.length > 0) {
          this.logger.log("\x1b[34mEncontrados libros desaparecidos");
          areChanges = true;
          booksToMarkAsDeleted.forEach(async(elem) => {
              await this.booksService.markAsMissing(elem.bookName);
          });
      }
      // FIN PROCESO DE LIBROS
    
      if (areChanges) {
      // Avisar al frontend si hay cambios
          this.websocketsGateway.sendNotificationToClient({action:"LIBRARY_UPDATE"});
      }
  }
}
