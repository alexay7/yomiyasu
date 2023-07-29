import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Document, Schema as MongoSchema, SchemaTypes, Types} from "mongoose";
import {User} from "../../users/schemas/user.schema";
import {Serie} from "../../series/schemas/series.schema";

export type ReviewDocument = Review & Document;

export type UserLevels = "Principiante" | "N5" | "N4" | "N3" | "N2" | "N1" | "N1+";

@Schema()
export class Review {
    _id?:MongoSchema.Types.ObjectId;

    @Prop({type:SchemaTypes.ObjectId, ref:User.name, required:true})
    user:Types.ObjectId;

    @Prop({type:SchemaTypes.ObjectId, ref:Serie.name, required:true})
    serie:Types.ObjectId;

    @Prop({type:String, required:true})
    userLevel:UserLevels;

    @Prop({type:Number, required:true, min:1, max:5})
    difficulty:number;

    @Prop({type:Number, min:0, max:10})
    valoration?:number;

    @Prop({type:String})
    comment?:string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);