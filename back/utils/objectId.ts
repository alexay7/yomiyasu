import {Types} from "mongoose";

export function toMongoObjectId(value:string): Types.ObjectId {
    const validObjectId = Types.ObjectId.isValid(value);

    if (!validObjectId) {
        throw new Error("Not an Object Id");
    }

    return new Types.ObjectId(value);
}