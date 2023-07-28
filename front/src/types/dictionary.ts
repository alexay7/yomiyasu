export interface DicionaryResult {
    display:string,
    words:WordDefinition[]
}

interface WordDefinition {
    id:string;
    kanji:KanjiVer[];
    kana:KanaVer[];
    sense:WordSense[];
}

interface KanjiVer {
    common:boolean;
    text:string;
    tags:string[];
}

interface KanaVer {
    common:boolean;
    text:string;
    tags:string[];
    appliesToKanji:string[];
}

interface WordSense {
    partOfSpeech:string[];
    appliesToKanji:string[];
    appliesToKana:string[];
    misc:string[];
    gloss:WordGloss[]
}

interface WordGloss {
    lang:string;
    text:string;
}