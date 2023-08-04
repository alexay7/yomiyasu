import {CacheInterceptor} from "@nestjs/cache-manager";
import {ExecutionContext} from "@nestjs/common";
import {Request} from "express";

export class MyCacheInterceptor extends CacheInterceptor {
    protected isRequestCacheable(context: ExecutionContext): boolean {
        const http = context.switchToHttp();
        const request:Request = http.getRequest();
  
        const ignoreCaching: boolean = this.reflector.get(
            "ignoreCaching",
            context.getHandler()
        );

        if (ignoreCaching) return false;

        return request.method === "GET";
    }
}