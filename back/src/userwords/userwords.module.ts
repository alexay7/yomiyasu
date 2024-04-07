import {Module} from "@nestjs/common";
import {UserwordsService} from "./userwords.service";
import {UserwordsController} from "./userwords.controller";
import {MongooseModule} from "@nestjs/mongoose";
import {UserWords, UserWordsSchema} from "./schemas/userwords.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            {name: UserWords.name, schema: UserWordsSchema}
        ])
    ],
    controllers: [UserwordsController],
    providers: [UserwordsService]
})
export class UserwordsModule {}
