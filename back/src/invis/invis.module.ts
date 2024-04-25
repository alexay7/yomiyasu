import {Module} from "@nestjs/common";
import {InvisService} from "./invis.service";
import {InvisController} from "./invis.controller";
import {MongooseModule} from "@nestjs/mongoose";
import {Invi, InviSchema} from "./schemas/invi.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: Invi.name, schema: InviSchema}
        ])
    ],
    controllers: [InvisController],
    providers: [InvisService]
})
export class InvisModule {}
