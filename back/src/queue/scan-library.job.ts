import {Process, Processor} from "@nestjs/bull";
import {Injectable} from "@nestjs/common";
import {AppService} from "../app.service";

@Injectable()
@Processor("rescan-library")
export class ScanWorker  {
    constructor(private readonly appService: AppService) {}

    @Process("scanmangas")
    async handle() {
    // Llamar a tu función pesada aquí
        await this.appService.rescanMangaLibrary();
    }

    @Process("scanranobe")
    async handleRanobe() {
    // Llamar a tu función pesada aquí
        await this.appService.rescanRanobeLibrary();
    }
}