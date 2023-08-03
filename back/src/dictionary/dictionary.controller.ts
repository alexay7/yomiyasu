import {Controller, Get, Param} from "@nestjs/common";
import {DictionaryService} from "./dictionary.service";

@Controller("dictionary")
export class DictionaryController {
    constructor(private readonly dictionaryService: DictionaryService) {}

    @Get("v1/:word")
    searchWord(@Param("word") word:string) {
        return this.dictionaryService.searchByWord(word);
    }

    @Get("v2/:word")
    searchSentence(@Param("word") word:string) {
        return this.dictionaryService.searchBySelection(word);
    }
}
