import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';

interface ExceptionBody {
  statusCode: number;
  message: string[];
  error: string;
}

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    let message: unknown = '';
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let status:"ACCESS"|"REFRESH"|"NONE"="NONE";

    if (exception instanceof HttpException) {
      const foundException = exception;
      httpStatus = foundException.getStatus();
      message = (foundException.getResponse() as ExceptionBody).message;

      if(httpStatus===401){
        // Si el error es Unauthorized, concretar qué lo ha causado
        const {refresh_token}=request.cookies;

        if(refresh_token){
          status="REFRESH"
        }
      }

    } else if (exception instanceof mongoose.Error.CastError) {
      const foundException = exception;
      httpStatus = HttpStatus.BAD_REQUEST;
      message = foundException.message;
    } else if (exception instanceof MongoServerError) {
      const foundException = exception;
      if (foundException.code === 11000) {
        httpStatus = HttpStatus.BAD_REQUEST;
        message = 'Llave duplicada';
      }
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error(exception);
    }

    response.status(httpStatus).json({
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      status
    });
  }
}
