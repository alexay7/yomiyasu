import {Process, Processor} from "@nestjs/bull";
import {Injectable} from "@nestjs/common";
import {AppService} from "../app.service";

@Injectable()
@Processor("rescanLibrary")
export class ScanWorker  {
    constructor(private readonly appService: AppService) {}

    @Process()
    async handle() {
    // Llamar a tu función pesada aquí
        await this.appService.rescanLibrary();
    }
}