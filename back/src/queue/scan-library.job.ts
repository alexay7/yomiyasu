import {Process, Processor} from "@nestjs/bull";
import {Injectable} from "@nestjs/common";
import {AppService} from "../app.service";

@Injectable()
@Processor("rescan-library")
export class ScanWorker  {
    constructor(private readonly appService: AppService) {}

    @Process("scanjob")
    async handle() {
    // Llamar a tu función pesada aquí
        await this.appService.rescanLibrary();
    }
}