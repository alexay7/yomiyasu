export interface UserWord {
    word:string,
    display:string,
    sentence:string,
    reading:string,
    meaning:string[],
    frequency:number,
    pitch:number[],
    createdAt?:Date
}