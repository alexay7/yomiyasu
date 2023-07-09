import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserToken, UserTokenDocument } from './schemas/token.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class TokensService {
  constructor(
    @InjectModel(UserToken.name)
    private userTokenModel: Model<UserTokenDocument>,
  ) {}

  async updateOrCreateToken(
    uuid: string,
    user: Types.ObjectId,
    newRefreshToken: string | null,
  ) {
    const foundToken = await this.userTokenModel.findOne({ user, uuid });
    if (foundToken) {
      return this.userTokenModel.findByIdAndUpdate(
        foundToken._id,
        { refreshToken: newRefreshToken },
        { new: true },
      );
    }
    const newToken: UserToken = {
      uuid,
      user,
      refreshToken: newRefreshToken,
    };
    return this.userTokenModel.create(newToken);
  }

  async findToken(
    uuid: string,
    user: Types.ObjectId,
  ): Promise<UserTokenDocument | null> {
    return this.userTokenModel.findOne({ uuid, user });
  }
}
