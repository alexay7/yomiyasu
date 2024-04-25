import {Injectable} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Invi} from "./schemas/invi.schema";
import {Model, Types} from "mongoose";

@Injectable()
export class InvisService {
    constructor(
        @InjectModel(Invi.name) private readonly inviModel: Model<Invi>
    ) {}

    create() {
        // Generate a random 14-character string
        let code = "";

        for (let i = 0; i < 14; i++) {
            code += String.fromCharCode(Math.floor(Math.random() * 26) + 65);
        }

        return this.inviModel.create({code});
    }

    useCode(code: string) {
        return this.inviModel.findOneAndUpdate({code, status:"unused"}, {status: "used"}, {new:true});
    }

    assignUser(code: string, userId: Types.ObjectId) {
        return this.inviModel.findOneAndUpdate({code}, {registeredUser: userId}, {new:true});
    }

}
