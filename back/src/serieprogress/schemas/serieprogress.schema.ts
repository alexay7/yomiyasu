import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {SchemaTypes, Types} from "mongoose";
import {User} from "../../users/schemas/user.schema";
import {Serie} from "../../series/schemas/series.schema";

export type SerieProgressDocument = SerieProgress & Document;

@Schema()
export class SerieProgress {
    _id?:Types.ObjectId;

    @Prop({type: SchemaTypes.ObjectId, ref: User.name, required: true})
    user: Types.ObjectId;
  
    @Prop({type:SchemaTypes.ObjectId, ref:Serie.name, required:true})
    serie:Types.ObjectId;
  
    @Prop({type:Array, default:[]})
    readBooks:Types.ObjectId[];

    @Prop({type:Boolean, default:false})
    paused:boolean;
}

export const SerieProgressSchema = SchemaFactory.createForClass(SerieProgress);

SerieProgressSchema.index({user:1, serie:1}, {unique:true});