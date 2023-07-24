import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    HttpStatus
} from "@nestjs/common";
import {UsersService} from "./users.service";
import {CreateUserDto} from "./dto/create-user.dto";
import {UpdateUserDto} from "./dto/update-user.dto";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";

@Controller("users")
@ApiTags("Usuarios")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @ApiOkResponse({status:HttpStatus.CREATED})
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @ApiOkResponse({status:HttpStatus.OK})
    findAll() {
        return this.usersService.findAll();
    }

    @Patch(":id")
    @ApiOkResponse({status:HttpStatus.OK})
    update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(":id")
    @ApiOkResponse({status:HttpStatus.OK})
    remove(@Param("id") id: string) {
        return this.usersService.remove(id);
    }
}
