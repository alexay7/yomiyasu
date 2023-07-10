import { Injectable, Logger } from '@nestjs/common';
import { SeriesService } from './series/series.service';
import { Cron } from '@nestjs/schedule';
import { join, extname } from 'path';
import * as fs from 'fs';

@Injectable()
export class AppService {
  constructor(private readonly seriesService: SeriesService) {}
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    console.log('llegó');
    return 'Hello World!';
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
  @Cron('0 0 3 * * *')
  async testing() {
    this.logger.log('\x1b[34mEscaneando biblioteca...');
    const existingFolders: string[] = [];
    const existingBooks: string[] = [];
    const mainFolderPath = join(process.cwd(), '..', 'exterior');

    const items = fs.readdirSync(mainFolderPath);

    // Escanea directorios y archivos html
    items.forEach((item) => {
      const itemPath = join(mainFolderPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        existingFolders.push(item);

        const subItems = fs.readdirSync(itemPath);
        const existingBooksInSubfolder = subItems.filter(
          (subItem) => extname(subItem) === '.html',
        );
        existingBooks.push(...existingBooksInSubfolder);
      }
    });

    // Busca todas las series no marcadas como desaparecidas de la base de datos
    const savedFolders = (await this.seriesService.findNonMissing()).map(
      (item) => item.path,
    );

    const foldersToAddInDb = existingFolders.filter(
      (value) => !savedFolders.includes(value),
    );

    const foldersToMarkAsDeleted = savedFolders.filter(
      (value) => !existingFolders.includes(value),
    );

    // Añade las series nuevas a la base de datos
    if (foldersToAddInDb.length > 0) {
      this.logger.log('\x1b[34mEncontradas series nuevas');
      foldersToAddInDb.forEach(async (elem) => {
        const newSeries = {
          path: elem,
          visibleName: elem,
          sortName: elem,
        };
        await this.seriesService.updateOrCreate(newSeries);
      });
    }

    // Marca las series no encontradas como desaparecidas
    if (foldersToMarkAsDeleted.length > 0) {
      this.logger.log('\x1b[34mEncontradas series desaparecidas');
      foldersToMarkAsDeleted.forEach(async (elem) => {
        await this.seriesService.markAsMissing(elem);
      });
    }
  }
}
