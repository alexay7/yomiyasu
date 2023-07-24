import {Controller} from "@nestjs/common";
import {SeriesService} from "./series.service";
import {ApiTags} from "@nestjs/swagger";

@Controller("series")
@ApiTags("Series")
export class SeriesController {
    constructor(private readonly seriesService: SeriesService) {}
}
