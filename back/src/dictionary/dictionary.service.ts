import {tokenize} from "@enjoyjs/node-mecab";
import {Injectable, InternalServerErrorException} from "@nestjs/common";
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
  
  async searchByKanji(word:string) {
      const db = await this.getDb();

      const wholeResult:WordWithDisplay = {display:word, words:[]};

      if (word.length < 7) {
          wholeResult.words = await readingBeginning(db, word, 1);

          if (wholeResult.words.length === 0) {
              wholeResult.words = await kanjiBeginning(db, word, 3);
          }
      }

      if (wholeResult.words.length > 0) {
          return [wholeResult];
      }

      const analisis = await tokenize(word);

      const queries = analisis.filter(x=>x.surface !== "BOS" && x.surface !== "EOS");

      const results:WordWithDisplay[] = [];

      await Promise.all(queries.map(async(currentWord, i)=>{
          let query = currentWord.feature.basicForm || "";
      
          if (currentWord.feature.pos === "動詞" || currentWord.feature.pos === "形容詞") {
              query = currentWord.feature.basicForm || query;
          }

          const result:WordWithDisplay = {display:currentWord.surface, words:[]};

          result.words = await readingBeginning(db, query, 1);

          if (result.words.length === 0) {
              result.words = await kanjiBeginning(db, query, 3);
          }

          if (currentWord.feature.pos === "助動詞" || currentWord.feature.pos === "助詞") {
              result.words = [];
          }

          results[i] = result;
      }));
      
      return results;
  }
}
