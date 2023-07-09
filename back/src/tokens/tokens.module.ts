import { BadRequestException, Module } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { UserToken, UserTokenSchema } from './schemas/token.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Model } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: UserToken.name,
        imports: [
          MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        ],
        useFactory: (userTokenModel: Model<UserToken>) => {
          const schema = UserTokenSchema;

          schema.pre<UserToken>('save', async function (next) {
            const { user } = this;

            const userExists =
              (await userTokenModel.count({ _id: user })) > 0 ? true : false;
            if (userExists) {
              next();
            } else {
              throw new BadRequestException('User does not exist');
            }
          });
          return schema;
        },
        inject: [getModelToken(User.name)],
      },
    ]),
  ],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
