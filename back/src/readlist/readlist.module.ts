import {Module} from "@nestjs/common";
import {ReadlistService} from "./readlist.service";
import {ReadlistController} from "./readlist.controller";
import {MongooseModule} from "@nestjs/mongoose";
import {ReadList, ReadListSchema} from "./schemas/readlist.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: ReadList.name, schema: ReadListSchema}
        ])
    ],
    controllers: [ReadlistController],
    providers: [ReadlistService],
    exports: [ReadlistService]
})
export class ReadlistModule {}
