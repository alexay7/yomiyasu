import {Word} from "jmdict-simplified-node";

export interface WordWithDisplay {
    words:Word[],
    display?:string
}