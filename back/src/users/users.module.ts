import {Module, Global} from "@nestjs/common";
import {UsersService} from "./users.service";
import {MongooseModule} from "@nestjs/mongoose";
import {User, UserSchema} from "./schemas/user.schema";
import {UsersController} from "./users.controller";
import {TokensModule} from "../tokens/tokens.module";

@Global()
@Module({
    imports: [
        MongooseModule.forFeature([{name: User.name, schema: UserSchema}]),
        TokensModule
    ],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController]
})
export class UsersModule {}
