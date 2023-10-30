import {Injectable, UnauthorizedException, ForbiddenException} from "@nestjs/common";
import {User, UserDocument} from "./schemas/user.schema";
import {InjectModel} from "@nestjs/mongoose";
import {Model, Types, UpdateQuery} from "mongoose";
import {CreateUserDto} from "./dto/create-user.dto";
import {UpdateUserDto} from "./dto/update-user.dto";
import {isEmail} from "class-validator";
import {checkPasswords, hashData} from "../auth/helpers/helper";

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

    async create(createUserDto: CreateUserDto): Promise<UserDocument> {
        return this.userModel.create(createUserDto);
    }

    async isAdmin(id:Types.ObjectId):Promise<boolean> {
        const foundUser = await this.userModel.findById(id, {admin:1});

        if (!foundUser) throw new UnauthorizedException();

        if (!foundUser.admin) throw new ForbiddenException();
        
        return foundUser.admin;
    }

    async findById(id: Types.ObjectId): Promise<User | null> {
        return this.userModel.findById(id);
    }

    async getUsers() {
        return this.userModel.find({}, {refreshToken:0, password:0});
    }

    async findByUsernameOrEmail(usernameOrEmail: string): Promise<UserDocument | null> {
        if (isEmail(usernameOrEmail)) {
            return this.userModel.findOne({email:usernameOrEmail});
        }
        return this.userModel.findOne({username:usernameOrEmail});
    }

    async changeUserRole(userId:Types.ObjectId, admin:boolean) {
        return this.userModel.findByIdAndUpdate(userId, {admin});
    }

    async update(
        id: Types.ObjectId,
        updateUserDto: UpdateUserDto
    ): Promise<User | null> {
        const foundUser = await this.userModel.findById(id);

        if (!foundUser) throw new ForbiddenException();

        const query:UpdateQuery<User> = {};

        if (updateUserDto.newPassword && updateUserDto.oldPassword) {
            const passwordMatches = await checkPasswords(foundUser.password, updateUserDto.oldPassword);

            if (!passwordMatches) throw new ForbiddenException();

            const newPass = await hashData(updateUserDto.newPassword);
            query.password = newPass;
        }

        if (updateUserDto.newUsername) {
            query.username = updateUserDto.newUsername;
        }

        return this.userModel.findByIdAndUpdate(id, query, {new: true});
    }

    async deleteUser(userId:Types.ObjectId) {
        return this.userModel.findByIdAndDelete(userId);
    }
}
