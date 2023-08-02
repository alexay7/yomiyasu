import {tokenize} from "@enjoyjs/node-mecab";
import {BadRequestException, Injectable, InternalServerErrorException} from "@nestjs/common";
import {AbstractIterator, AbstractLevelDOWN} from "abstract-leveldown";
import {kanjiBeginning, readingBeginning, setup as setupJmdict} from "jmdict-simplified-node";
import levelup from "levelup";
import {join} from "path";
import {WordWithDisplay} from "./interfaces/word";



@Injectable()
export class DictionaryService {
    private readonly dbPromise: Promise<levelup.LevelUp<AbstractLevelDOWN<any, any>, AbstractIterator<any, any>>>;
  private db: levelup.LevelUp<AbstractLevelDOWN<any, any>, AbstractIterator<any, any>> | null = null; // Once resolved, db will hold the actual object.
  private loadingDb: boolean;

  constructor() {
      this.dbPromise = this.setupDB();
  }

  private async setupDB(): Promise<levelup.LevelUp<AbstractLevelDOWN<any, any>, AbstractIterator<any, any>>> {
      this.loadingDb = true;
      const dictFolder = join(process.cwd(), "..", "dicts");
      const jmdictPromise = setupJmdict(join(dictFolder, "jmdict"), join(dictFolder, "jmdict-eng-3.5.0.json"));
      const {db} = await jmdictPromise;
      this.loadingDb = false;
      return db;
  }

  async getDb(): Promise<levelup.LevelUp<AbstractLevelDOWN<any, any>, AbstractIterator<any, any>>> {
      if (this.loadingDb) throw new InternalServerErrorException("Dictionary is being loaded into the cache");

      if (!this.db) {
          this.db = await this.dbPromise;
      }
      return this.db;
  }
  
  async getWordMeaning(word:string):Promise<WordWithDisplay | null> {
      const db = await this.getDb();

      const wholeResult:WordWithDisplay = {display:word, words:[]};

      wholeResult.words = await readingBeginning(db, word, 1);

      if (wholeResult.words.length === 0) {
          wholeResult.words = await kanjiBeginning(db, word, 3);
      }
    
      return wholeResult;
  }

  async searchByKanji(word:string) {
      if (word.length > 30) {
          throw new BadRequestException("Texto demasiado largo");
      }

      const prevResult = await this.getWordMeaning(word);

      if (prevResult &&  prevResult.words.length > 0) {
          return [prevResult];
      }

      const words:WordWithDisplay[] = [];

      const regex = /[^\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g;

      let auxWord = word.replace(regex, "");

      while (auxWord.length > 0) {
          for (let index = auxWord.length; index >= 0; index--) {
              const text = auxWord.substring(0, index);
          
              let result = await this.getWordMeaning(text);

              if (word.length > 2 && word.length < 6) {
                  const analysis = await tokenize(text);
                  const realAnalysis = analysis.slice(1, analysis.length - 1);
                  if (realAnalysis.length > 0 && realAnalysis[0].feature.pos === "動詞") {
                      result = await this.getWordMeaning(realAnalysis[0].feature.basicForm || text);
                      if (result) {
                          result.display = realAnalysis[0].surface;
                          words.push(result);
                          auxWord = auxWord.replace(realAnalysis[0].surface, "");
                      }
                  }
              }

              if (result?.words && result?.words.length > 0) {
                  let exactMatch = false;
                  result.words.forEach((definition)=>{
                      definition.kana.forEach((kanaDef)=>{
                          if (text === kanaDef.text) {
                              exactMatch = true;
                          }
                      });
                      definition.kanji.forEach((kanjiDef)=>{
                          if (text === kanjiDef.text) {
                              exactMatch = true;
                          }
                      });
                  });
                  if (exactMatch) {
                      result.words = result.words.filter((v, i, a)=>a.findIndex(x=>x.id === v.id) === i);
                      words.push(result);
                      auxWord = auxWord.replace(result.display || "", "");
                      break;
                  }
              }

              if (text.length === 1) {
                  words.push({display:auxWord, words:[]});
                  auxWord = "";
                  break;
              }
          }
      }
      return words;
  }
}
