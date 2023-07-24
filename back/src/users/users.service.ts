import {Injectable} from "@nestjs/common";
import {User, UserDocument} from "./schemas/user.schema";
import {InjectModel} from "@nestjs/mongoose";
import {Model, Types} from "mongoose";
import {CreateUserDto} from "./dto/create-user.dto";
import {UpdateUserDto} from "./dto/update-user.dto";
import {isEmail} from "class-validator";

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

    async create(createUserDto: CreateUserDto): Promise<UserDocument> {
        return this.userModel.create(createUserDto);
    }

    async findAll(): Promise<UserDocument[]> {
        return this.userModel.find();
    }

    async findById(id: Types.ObjectId): Promise<User | null> {
        return this.userModel.findById(id);
    }

    async findByUsernameOrEmail(usernameOrEmail: string): Promise<UserDocument | null> {
        if (isEmail(usernameOrEmail)) {
            return this.userModel.findOne({email:usernameOrEmail});
        }
        return this.userModel.findOne({username:usernameOrEmail});
    }

    async update(
        id: string,
        updateUserDto: UpdateUserDto
    ): Promise<UserDocument | null> {
        return this.userModel.findByIdAndUpdate(id, updateUserDto, {new: true});
    }

    async remove(user: string): Promise<void | null> {
        return this.userModel.findByIdAndDelete(user);
    }
}
