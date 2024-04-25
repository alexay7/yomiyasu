import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {SchemaTypes, Types} from "mongoose";
import {User} from "../../users/schemas/user.schema";

@Schema()
export class Invi {
    _id: Types.ObjectId;
    
    @Prop({required: true, type:String})
    code: string;

    @Prop({type: SchemaTypes.ObjectId, ref: User.name})
    registeredUser: Types.ObjectId;

    @Prop({type:String, enum:["unused", "used"], default:"unused"})
    status: "unused" | "used";
}

export const InviSchema = SchemaFactory.createForClass(Invi);

InviSchema.index({code: 1}, {unique: true});
