import {tokenize} from "@enjoyjs/node-mecab";
import {Injectable} from "@nestjs/common";
import {AbstractIterator, AbstractLevelDOWN} from "abstract-leveldown";
import {kanjiBeginning, readingBeginning, setup as setupJmdict} from "jmdict-simplified-node";
import levelup from "levelup";
import {join} from "path";

@Injectable()
export class DictionaryService {
    private readonly dbPromise: Promise<levelup.LevelUp<AbstractLevelDOWN<any, any>, AbstractIterator<any, any>>>;
  private db: levelup.LevelUp<AbstractLevelDOWN<any, any>, AbstractIterator<any, any>> | null = null; // Once resolved, db will hold the actual object.

  constructor() {
      this.dbPromise = this.setupDB();
  }

  private async setupDB(): Promise<levelup.LevelUp<AbstractLevelDOWN<any, any>, AbstractIterator<any, any>>> {
      const dictFolder = join(process.cwd(), "..", "dicts");
      const jmdictPromise = setupJmdict(join(dictFolder, "jmdict"), join(dictFolder, "jmdict-eng-3.5.0.json"));
      const {db} = await jmdictPromise;
      return db;
  }

  async getDb(): Promise<levelup.LevelUp<AbstractLevelDOWN<any, any>, AbstractIterator<any, any>>> {
      if (!this.db) {
          this.db = await this.dbPromise;
      }
      return this.db;
  }
  
  async searchByKanji(word:string) {
      const db = await this.getDb();
      let query = word;
      const parsedWord = await tokenize(word);
      
      if (parsedWord[1].feature.pos === "動詞" || parsedWord[1].feature.pos === "形容詞") {
          query = parsedWord[1].feature.basicForm || query;
      }
    
      let result = await kanjiBeginning(db, query, 3);

      if (result.length === 0) {
          result = await readingBeginning(db, query, 3);
      }

      return result;
  }
}
