import {Injectable, Logger} from "@nestjs/common";
import {SeriesService} from "./series/series.service";
import {Cron} from "@nestjs/schedule";
import {join, extname} from "path";
import * as fs from "fs";
import {BooksService} from "./books/books.service";
import {extractUrlFromHtml, getCharacterCount, getNovelCharacterCount, getNovelCover, listImageFiles} from "./books/helpers/helpers";
import {ensureThumbnails} from "./books/helpers/thumbnail";
import {Book} from "./books/schemas/book.schema";
import {WebsocketsGateway} from "./websockets/websockets.gateway";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import EPub from "epub2";


@Injectable()
export class AppService {
    constructor(
        private readonly seriesService: SeriesService,
        private readonly booksService: BooksService,
        private readonly websocketsGateway:WebsocketsGateway,
        @InjectQueue("rescan-library") private readonly rescanQueue: Queue
    ) {}
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
      return "Hello World!";
  }

  @Cron("0 0 3 * * *")
  async addScheduleToQueue() {
      const job = await this.rescanQueue.add("scanmangas");
      const job2 = await this.rescanQueue.add("scanranobe");

      console.log(`created job ${ job.id}`);
      console.log(`created job ${ job2.id}`);
  }

  /**
   * Este cronjob escanea todos los archivos dentro de la
   * biblioteca de archivos siguiendo la siguiente estructura
   *
   * /root/mangas/{nombreserie}/{nombrelibro}.html
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
  async rescanMangaLibrary() {
      try {
          this.logger.log("\x1b[34mEscaneando biblioteca de manga...");
          const existingFolders: string[] = [];
          const existingBooks: {
              seriePath: string;
              bookName: string;
              bookPath?: string;
          }[] = [];
          const existingImageFolders: {
              seriePath: string;
              folderName: string;
          }[] = [];
          const mainFolderPath = join(process.cwd(), "..", "exterior", "mangas");
          let areChanges = false;

          this.cleanupLeakedZips(join(process.cwd(), "..", "exterior"));

          const items = fs.readdirSync(mainFolderPath);

          // Escanea directorios y archivos html
          items.forEach((item) => {
              const itemPath = join(mainFolderPath, item);
              const isZipFile = item.endsWith(".zip");
              if (isZipFile) {
                  fs.unlinkSync(itemPath); // Delete the .zip file
              }
              else {
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

                      // Carpetas de la serie: pueden ser carpetas de imágenes de
                      // un html (mokuro) o tomos de imágenes sin mokuro. Cuál es
                      // cuál se decide más abajo, al conocer los html.
                      subItems.forEach((subItem) => {
                          try {
                              if (fs.statSync(join(itemPath, subItem)).isDirectory()) {
                                  existingImageFolders.push({
                                      seriePath: item,
                                      folderName: subItem
                                  });
                              }
                          } catch (error) {
                              this.logger.warn(`No se pudo leer ${join(itemPath, subItem)}: ${error}`);
                          }
                      });
                  }
              }
          });

          // INICIO PROCESO DE SERIES
          // Busca todas las series no marcadas como desaparecidas de la base de datos
          const savedFolders = (await this.seriesService.findNonMissing("manga")).map(
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
              // Promise to wait for the series to be created
              this.logger.log("\x1b[34mEncontradas series de manga nuevas");
              areChanges = true;
              await Promise.all(
                  foldersToAddInDb.map(async(elem) => {
                      const newSeries = {
                          path: elem,
                          visibleName: elem,
                          sortName: elem,
                          alternativeNames:[elem],
                          variant:"manga" as const
                      };
                      await this.seriesService.updateOrCreate(newSeries);
                  })
              );
          }

          // Marca las series no encontradas como desaparecidas
          if (foldersToMarkAsDeleted.length > 0) {
              this.logger.log("\x1b[34mEncontradas series de manga desaparecidas");
              areChanges = true;
              foldersToMarkAsDeleted.forEach(async(elem) => {
                  await this.seriesService.markAsMissing(elem, "manga");
              });
          }
          // FIN PROCESO DE SERIES

          // INICIO PROCESO DE LIBROS
          // Busca todos los libros no marcados como desaparecidos de la base de datos
          const savedBooks = await this.booksService.findNonMissing("manga");

          const savedBookNames = new Set(savedBooks.map((book) => book.path));
          const existingHtmlBookNames = new Set(existingBooks.map((book) => book.bookName));

          // Carpetas de imágenes referenciadas por un html (mokuro): no son
          // tomos por sí mismas, sino las páginas de ese html. Los tomos de
          // imágenes no cuentan: su carpeta es su propio contenido.
          const referencedImageFolders = new Set<string>(
              savedBooks
                  .filter((book) => book.format !== "images" && book.imagesFolder)
                  .map((book) => `${book.seriePath}/${book.imagesFolder}`)
          );

          // Filtra los libros nuevos (html)
          const booksToAddInDb = existingBooks.filter(
              (value) => !savedBookNames.has(value.bookName)
          );

          // Añade los libros nuevos a la base de datos
          if (booksToAddInDb.length > 0) {
              this.logger.log("\x1b[34mEncontrados libros nuevos");
              areChanges = true;

              const addResults = await Promise.allSettled(booksToAddInDb.map(async(elem) => {
                  if (!elem.bookPath) return;

                  const imagesFolder = await extractUrlFromHtml(elem.bookPath);

                  if (!imagesFolder) return;

                  // Marca la carpeta como páginas de este html para que no se
                  // registre también como tomo de imágenes
                  referencedImageFolders.add(`${elem.seriePath}/${imagesFolder.folderName}`);

                  const savedBook = savedBooks.find((book) => book.path === elem.bookName);

                  if (savedBook) {
                      // La carpeta era un tomo de imágenes y ahora tiene html:
                      // se convierte en tomo de mokuro
                      if (savedBook.format === "images" && savedBook._id) {
                          const charData = await getCharacterCount(elem.bookPath);

                          this.logger.log(`\x1b[34m${elem.bookName} convertido a tomo de mokuro`);

                          await this.booksService.convertToMokuro(savedBook._id, {
                              imagesFolder: imagesFolder.folderName,
                              thumbnailPath: imagesFolder.thumbnailPath,
                              pages: imagesFolder.totalImages,
                              characters: charData.total,
                              pageChars: charData.pages
                          });
                      }

                      return;
                  }

                  const foundSerie = await this.seriesService.getIdFromPath(elem.seriePath, "manga");
                  await this.seriesService.increaseBookCount(foundSerie._id);
                  const charData = await getCharacterCount(elem.bookPath);

                  const newBook = {
                      path: elem.bookName,
                      visibleName: elem.bookName,
                      sortName: elem.bookName,
                      imagesFolder: imagesFolder.folderName,
                      serie: foundSerie,
                      seriePath:elem.seriePath,
                      thumbnailPath: imagesFolder.thumbnailPath,
                      pages: imagesFolder.totalImages,
                      characters: charData.total,
                      pageChars:charData.pages,
                      variant:"manga" as "manga" | "novela",
                      format:"mokuro" as "mokuro" | "images"
                  };
                  await this.booksService.updateOrCreate(newBook);
              }));

              this.logFailedBooks(addResults, "manga");
          }

          // Carpetas de imágenes sin html que las referencie: candidatas a tomo.
          // Se calcula después de registrar los html nuevos para conocer sus carpetas.
          const imageFolderCandidates = (
              await Promise.all(
                  existingImageFolders
                      .filter(
                          (folder) =>
                              !referencedImageFolders.has(`${folder.seriePath}/${folder.folderName}`)
                      )
                      .map(async(folder) => ({
                          ...folder,
                          images: await listImageFiles(join(mainFolderPath, folder.seriePath, folder.folderName))
                      }))
              )
          ).filter((folder) => folder.images.length > 0);

          const imageBookNames = new Set(imageFolderCandidates.map((folder) => folder.folderName));

          // Un tomo de mokuro marcado como desaparecido no debe resucitar como
          // tomo de imágenes solo porque su carpeta siga en disco
          const missingBookFormats = new Map(
              (await this.booksService.findMissing("manga")).map((book) => [book.path, book.format])
          );

          // Tomos de imágenes nuevos (sin colisión con un html del mismo nombre)
          const imageBooksToAdd = imageFolderCandidates.filter(
              (folder) =>
                  !savedBookNames.has(folder.folderName) &&
                  !existingHtmlBookNames.has(folder.folderName) &&
                  missingBookFormats.get(folder.folderName) !== "mokuro"
          );

          // Filtra los libros a marcar como borrados
          const booksToMarkAsDeleted = savedBooks.filter(
              (value) =>
                  !existingHtmlBookNames.has(value.path) &&
                  !imageBookNames.has(value.path)
          );

          // Añade los tomos de imágenes (carpetas sin html de mokuro)
          if (imageBooksToAdd.length > 0) {
              this.logger.log("\x1b[34mEncontrados tomos de imágenes nuevos");
              areChanges = true;

              const addResults = await Promise.allSettled(imageBooksToAdd.map(async(folder) => {
                  const foundSerie = await this.seriesService.getIdFromPath(folder.seriePath, "manga");
                  await this.seriesService.increaseBookCount(foundSerie._id);

                  const newBook = {
                      path: folder.folderName,
                      visibleName: folder.folderName,
                      sortName: folder.folderName,
                      imagesFolder: folder.folderName,
                      serie: foundSerie,
                      seriePath: folder.seriePath,
                      thumbnailPath: folder.images[0],
                      pages: folder.images.length,
                      characters: 0,
                      pageChars: [],
                      variant: "manga" as const,
                      format: "images" as const
                  };

                  await this.booksService.updateOrCreate(newBook);
              }));

              this.logFailedBooks(addResults, "manga");
          }

          // Genera las miniaturas de portada que falten (incluidos libros ya existentes)
          await this.ensureLibraryThumbnails("manga");

          // Marca los libros no encontrados como desaparecidos
          if (booksToMarkAsDeleted.length > 0) {
              this.logger.log("\x1b[34mEncontrados libros desaparecidos");
              areChanges = true;
              booksToMarkAsDeleted.forEach(async(elem) => {
                  await this.booksService.markAsMissing(elem.path, "manga");
              });
          }
          // FIN PROCESO DE LIBROS
          this.logger.log("\x1b[34mProceso de búsqueda de mangas finalizado");
          if (areChanges) {
              // Avisar al frontend si hay cambios
              this.websocketsGateway.sendNotificationToClient({action:"LIBRARY_UPDATE"});
          }
      } catch (e) {
          this.logger.error("Something went wrong");
          console.error(e);
      }
  }

  /**
   * Este cronjob escanea todos los archivos dentro de la
   * biblioteca de archivos siguiendo la siguiente estructura
   * 
   * /root/ranobe/{nombreserie}/{nombrelibro}.epub
   */
  async rescanRanobeLibrary() {
      try {
          this.logger.log("\x1b[34mEscaneando biblioteca de novelas...");

          const existingFolders: string[] = [];
          const mainFolderPath = join(process.cwd(), "..", "exterior", "novelas");
          let areChanges = false;
          const existingBooks: {
              seriePath: string;
              bookName: string;
              bookPath?: string;
          }[] = [];

          this.cleanupLeakedZips(join(process.cwd(), "..", "exterior"));

          const items = fs.readdirSync(mainFolderPath);

          // Escanea directorios y archivos html
          items.forEach((item) => {
              const itemPath = join(mainFolderPath, item);
              const stat = fs.statSync(itemPath);

              if (stat.isDirectory()) {
                  existingFolders.push(item);

                  const subItems = fs.readdirSync(itemPath);
                  const existingBooksInSubfolder = subItems.filter(
                      (subItem) => extname(subItem) === ".epub"
                  );
                  existingBooksInSubfolder.forEach((foundBook) => {
                      // Get the title of the epub
                      //   const book = await EPub.createAsync(join(itemPath, foundBook));

                      //   const title = book.metadata.title;

                      existingBooks.push({
                          seriePath: item,
                          bookName: foundBook.replace(".epub", ""),
                          bookPath: join(itemPath, foundBook)
                      });
                  });
              }
          });

          // INICIO PROCESO DE SERIES
          // Busca todas las series no marcadas como desaparecidas de la base de datos
          const savedFolders = (await this.seriesService.findNonMissing("novela")).map(
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
              this.logger.log("\x1b[34mEncontradas series de novela nuevas");
              areChanges = true;
              
              // Promise to wait for the series to be created
              await Promise.all(
                  foldersToAddInDb.map(async(elem) => {
                      const newSeries = {
                          path: elem,
                          visibleName: elem,
                          sortName: elem,
                          alternativeNames:[elem],
                          variant:"novela" as const
                      };
                      await this.seriesService.updateOrCreate(newSeries);
                  })
              );

          }

          // Marca las series no encontradas como desaparecidas
          if (foldersToMarkAsDeleted.length > 0) {
              this.logger.log("\x1b[34mEncontradas series de novela desaparecidas");
              areChanges = true;
              foldersToMarkAsDeleted.forEach(async(elem) => {
                  await this.seriesService.markAsMissing(elem, "novela");
              });
          }
          // FIN PROCESO DE SERIES

          // INICIO PROCESO DE LIBROS
          // Busca todos los libros no marcados como desaparecidos de la base de datos
          const savedBooks = (await this.booksService.findNonMissing("novela")).map(
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
              this.logger.log("\x1b[34mEncontradas novelas nuevas");
              areChanges = true;

              const addResults = await Promise.allSettled(booksToAddInDb.map(async(elem) => {
                  if (elem.bookPath) {
                      const foundSerie = await this.seriesService.getIdFromPath(elem.seriePath, "novela");
                      await this.seriesService.increaseBookCount(foundSerie);
                      const book = await EPub.createAsync(elem.bookPath);

                      const chars = await getNovelCharacterCount(book);

                      const hasCover = await getNovelCover(book, elem.bookPath, elem.bookName);

                      const newBook = {
                          path: elem.bookName,
                          epubTitle: book.metadata.title,
                          visibleName: book.metadata.title,
                          sortName: elem.bookName,
                          serie: foundSerie,
                          seriePath:elem.seriePath,
                          thumbnailPath: hasCover ? elem.bookName + ".jpg" : "",
                          characters: chars,
                          variant:"novela" as "manga" | "novela"
                      };

                      await this.booksService.updateOrCreate(newBook);
                  }
              }));

              this.logFailedBooks(addResults, "novela");
          }

          // Genera las miniaturas de portada que falten (incluidos libros ya existentes)
          await this.ensureLibraryThumbnails("novela");

          // Marca los libros no encontrados como desaparecidos
          if (booksToMarkAsDeleted.length > 0) {
              this.logger.log("\x1b[34mEncontrados novelas desaparecidas");
              areChanges = true;
              booksToMarkAsDeleted.forEach(async(elem) => {
                  await this.booksService.markAsMissing(elem.bookName, "novela");
              });
          }
          // FIN PROCESO DE LIBROS
          this.logger.log("\x1b[34mProceso de búsqueda de novelas finalizado");
          if (areChanges) {
              // Avisar al frontend si hay cambios
              this.websocketsGateway.sendNotificationToClient({action:"LIBRARY_UPDATE"});
          }
 
      } catch (e) {
          this.logger.error("Something went wrong");
          console.error(e);
      }
  }

  /**
   * Elimina los .zip residuales que las versiones anteriores de la descarga
   * de series dejaban en la raíz de exterior/. Las descargas actuales se
   * envían directamente al cliente, así que cualquier .zip ahí es basura.
   */
  private cleanupLeakedZips(exteriorRoot: string) {
      let removed = 0;

      for (const item of fs.readdirSync(exteriorRoot)) {
          if (!item.endsWith(".zip")) continue;

          try {
              fs.unlinkSync(join(exteriorRoot, item));
              removed++;
          } catch (error) {
              this.logger.warn(`No se pudo borrar el zip residual ${item}: ${error}`);
          }
      }

      if (removed > 0) {
          this.logger.log(`\x1b[34mBorrados ${removed} zips residuales de exterior/`);
      }
  }

  /**
   * Ruta (relativa a exterior/) de la portada de un libro, o null si no
   * tiene portada registrada.
   */
  private coverRelativePath(book: Book): string | null {
      if (!book.thumbnailPath) return null;

      const parts = [book.variant === "manga" ? "mangas" : "novelas", book.seriePath];

      if (book.variant === "manga" || book.mokured) {
          if (!book.imagesFolder) return null;
          parts.push(book.imagesFolder);
      }

      parts.push(book.thumbnailPath);

      return join(...parts);
  }

  /**
   * Genera en exterior/thumbnails las miniaturas de portada que falten (o
   * estén desactualizadas) para todos los libros de la biblioteca. Se ejecuta
   * en cada rescan y es idempotente.
   */
  private async ensureLibraryThumbnails(variant: "manga" | "novela") {
      const books = await this.booksService.findNonMissing(variant);
      const exteriorRoot = join(process.cwd(), "..", "exterior");

      const sourcePaths = books
          .map((book) => this.coverRelativePath(book))
          .filter((sourcePath): sourcePath is string => Boolean(sourcePath));

      if (sourcePaths.length === 0) return;

      this.logger.log(`\x1b[34mRevisando miniaturas de ${variant} (${sourcePaths.length} portadas)...`);

      const result = await ensureThumbnails(exteriorRoot, sourcePaths);

      if (result.created > 0 || result.failed > 0) {
          this.logger.log(
              `\x1b[34mMiniaturas de ${variant}: ${result.created} generadas, ` +
              `${result.skipped} al día, ${result.missing} sin original, ${result.failed} fallidas`
          );
      }
  }

  /** Loggea los libros nuevos que fallaron durante un escaneo. */
  private logFailedBooks(results: PromiseSettledResult<unknown>[], variant: "manga" | "novela") {
      const failed = results.filter((result) => result.status === "rejected");

      if (failed.length === 0) return;

      this.logger.error(`Fallaron ${failed.length} libros nuevos de ${variant} durante el escaneo`);

      failed.forEach((result) => {
          if (result.status === "rejected") console.error(result.reason);
      });
  }
}
