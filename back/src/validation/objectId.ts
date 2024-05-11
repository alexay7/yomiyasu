import {BadRequestException, Injectable, PipeTransform} from 
    "@nestjs/common";
import {Types} from "mongoose";
import {toMongoObjectId} from "../utils/objectId";
import {ValidationOptions, registerDecorator} from "class-validator";

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<unknown, Types.ObjectId | undefined> {
    transform(value: unknown): Types.ObjectId | undefined {
        if (!value) {
            return undefined;
        }

        // If not string return
        if (typeof value !== "string") {
            return undefined;
        }

        try {
            return toMongoObjectId(value);
        } catch {
            throw new BadRequestException(`${value} is an Invalid ObjectId`);
        }
    }
}

export function IsMongoIdObject(validationOptions?: ValidationOptions) {
    return function(object: object, propertyName: string) {
        registerDecorator({
            name: "IsMongoIdObject",
            target: object.constructor,
            propertyName: propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: unknown) {
                    // If not string return
                    if (typeof value !== "string") {
                        return false;
                    }

                    const validObjectId = Types.ObjectId.isValid(value);

                    if (!validObjectId) {
                        throw new BadRequestException("Invalid ObjectId on " + propertyName);
                    }

                    return validObjectId;
                }
            }
        });
    };
}