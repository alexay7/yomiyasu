import {Controller, Get, Inject, Req, UnauthorizedException, UseGuards, Query, Param, HttpStatus, Patch, Body, NotFoundException, UseInterceptors, Res, BadRequestException} from "@nestjs/common";
import {BooksService} from "./books.service";
import {Request, Response} from "express";
import {Types} from "mongoose";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {SearchQuery, UpdateBook} from "./interfaces/query";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {ParseObjectIdPipe} from "../validation/objectId";
import {UsersService} from "../users/users.service";
import {WebsocketsGateway} from "../websockets/websockets.gateway";
import {UpdateBookDto, UpdateCoverDto} from "./dto/update-book.dto";
import {getCharacterCount, getNovelCharacterCount} from "./helpers/helpers";
import {ensureThumbnail} from "./helpers/thumbnail";
import {resolveInside, streamFileToResponse, streamZipToResponse} from "./helpers/zipDownload";
import {join} from "path";
import {CacheInterceptor, CacheTTL, CACHE_MANAGER} from "@nestjs/cache-manager";
import {Cache} from "cache-manager";
import * as path from "path";
import * as fs from "fs-extra";
import EPub from "epub2";

@Controller("books")
@ApiTags("Libros")
@UseGuards(JwtAuthGuard)
export class BooksController {
    constructor(
        private readonly booksService: BooksService,
        private readonly usersService:UsersService,
        private readonly websocketsGateway:WebsocketsGateway,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
    ) {}
  
    @Get("genresAndArtists")
    @UseInterceptors(CacheInterceptor)
    @ApiOkResponse({status:HttpStatus.OK})
    async getGenresAndArtists() {
        return this.booksService.getArtistsAndGenres();
    }

    @Get(":variant")
    @CacheTTL(60)
    @ApiOkResponse({status:HttpStatus.OK})
    async filterBooks(@Req() req:Request, @Query() query:SearchQuery, @Param("variant") variant:"manga" | "novela" | "all") {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};

        const cached = await this.cacheManager.get(`${userId}-${req.url}`);
        if (cached) {
            return cached;
        }

        if (!query.serie) {
            if (!query.page || query.page < 1) {
                query.page = 1;
            }

            if (!query.limit || query.limit < 1) {
                query.limit = 25;
            }
        }

        const response = await this.booksService.filterBooks(userId, variant, query);

        await this.cacheManager.set(`${userId}-${req.url}`, response);

        return response;
    }

    @Patch(":id")
    @ApiOkResponse({status:HttpStatus.OK})
    async updateSerie(@Req() req:Request, @Param("id", ParseObjectIdPipe) book:Types.ObjectId, @Body() updateBookDto:UpdateBookDto) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        this.websocketsGateway.sendNotificationToClient({action:"LIBRARY_UPDATE"});

        const updateBook:UpdateBook = {
            ...updateBookDto,
            lastModifiedDate:new Date()
        };

        return this.booksService.editBook(book, updateBook);
    }

    @Patch(":id/chars")
    async updateCharacterCount(@Req() req:Request, @Param("id", ParseObjectIdPipe) book:Types.ObjectId, @Query("borders") borders:boolean) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        const foundBook = await this.booksService.findById(book);
        
        if (!foundBook) throw new NotFoundException();

        if (foundBook.format === "images") {
            throw new BadRequestException("Este tomo no tiene html de mokuro");
        }

        const mainFolderPath = join(process.cwd(), "..", "exterior");

        if (foundBook.mokured || foundBook.variant === "manga") {
            const characters = await getCharacterCount(join(mainFolderPath, foundBook.mokured ? "novelas" : "mangas", foundBook.seriePath, foundBook.path + ".html"), borders);

            return this.booksService.editBook(book, {characters:characters.total, pageChars:characters.pages});
        }

        const bookEpub = await EPub.createAsync(join(mainFolderPath, "novelas", foundBook.seriePath, foundBook.path + ".epub"));

        const chars = await getNovelCharacterCount(bookEpub);

        return this.booksService.editBook(book, {characters:chars});
    }

    @Get(":id/images")
    async getEbookImages(@Req() req:Request, @Param("id", ParseObjectIdPipe) book:Types.ObjectId) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        const foundBook = await this.booksService.findById(book);

        if (!foundBook) throw new NotFoundException();

        const mainFolderPath = join(process.cwd(), "..", "exterior");

        const ebookFile = join(mainFolderPath, "novelas", foundBook.seriePath, foundBook.path + ".epub");

        const bookEpub = await EPub.createAsync(ebookFile) as EPub;

        return bookEpub.listImage();
    }

    @Patch(":id/cover")
    async updateCover(@Req() req:Request, @Param("id", ParseObjectIdPipe) book:Types.ObjectId, @Body() body:UpdateCoverDto) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        const foundBook = await this.booksService.findById(book);

        if (!foundBook) throw new NotFoundException();

        const mainFolderPath = join(process.cwd(), "..", "exterior");

        const bookEpub = await EPub.createAsync(join(mainFolderPath, "novelas", foundBook.seriePath, foundBook.path + ".epub")) as EPub;

        const [image] = await bookEpub.getImageAsync(body.cover);

        if (!image) throw new NotFoundException();

        const cover = join(mainFolderPath, "novelas", foundBook.seriePath, foundBook.path + ".jpg");

        await fs.writeFile(cover, image);

        // Regenera la miniatura para que la nueva portada se vea al momento
        await ensureThumbnail(mainFolderPath, join("novelas", foundBook.seriePath, foundBook.path + ".jpg"));

        return {status:"ok"};
    }

    @Get("book/:id")
    @UseInterceptors(CacheInterceptor)
    @ApiOkResponse({status:HttpStatus.OK})
    async getBook(@Param("id") book:Types.ObjectId) {
        const foundBook = await this.booksService.findById(book);

        if (!foundBook) throw new NotFoundException();

        if (foundBook.format === "images") {
            const pagePaths = await this.booksService.getPagePaths(foundBook);

            return {...foundBook.toObject(), pagePaths};
        }

        return foundBook;
    }
    
    @Get(":id/defaultname")
    @ApiOkResponse({status:HttpStatus.OK})
    async getBookDefaultName( @Param("id") book:Types.ObjectId) {
        return this.booksService.getDefaultName(book);
    }

    @Get(":id/next")
    async getNextBook(@Req() req:Request, @Param("id", ParseObjectIdPipe) id:Types.ObjectId) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        const foundBook = await this.booksService.findById(id);

        if (!foundBook) throw new NotFoundException();

        const serieBooks = await this.booksService.filterBooks(userId, foundBook.variant, {serie:foundBook.serie, sort:"sortName"});

        const bookIndex = serieBooks.findIndex(x=>x.path === foundBook.path);

        if (bookIndex + 1 === serieBooks.length) {
            return {_id:"end"};
        }

        return serieBooks[bookIndex + 1];
    }

    @Get(":id/prev")
    async getPrevBook(@Req() req:Request, @Param("id", ParseObjectIdPipe) id:Types.ObjectId) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        const foundBook = await this.booksService.findById(id);

        if (!foundBook) throw new NotFoundException();

        const serieBooks = await this.booksService.filterBooks(userId, foundBook.variant, {serie:foundBook.serie, sort:"sortName"});

        const bookIndex = serieBooks.findIndex(x=>x.path === foundBook.path);

        if (bookIndex === 0) {
            return {_id:"start"};
        }

        return serieBooks[bookIndex - 1];
    }

    @Get(":bookId/download")
    async downloadZip(@Res() res:Response, @Param("bookId", ParseObjectIdPipe) book:Types.ObjectId) {
        const foundBook = await this.booksService.findById(book);

        if (!foundBook) throw new NotFoundException();

        if (!foundBook.seriePath || !foundBook.path) throw new BadRequestException();

        const exteriorRoot = path.join(__dirname, "..", "..", "..", "exterior");

        if (foundBook.variant === "novela") {
            const epubPath = resolveInside(exteriorRoot, "novelas", foundBook.seriePath, `${foundBook.path}.epub`);

            if (!fs.existsSync(epubPath)) throw new NotFoundException();

            await streamFileToResponse(res, epubPath, "application/epub+zip", `${foundBook.path}.epub`);

            return;
        }

        if (!foundBook.imagesFolder) throw new BadRequestException();

        const imagesFolderPath = resolveInside(exteriorRoot, "mangas", foundBook.seriePath, foundBook.imagesFolder);

        // Tomo sin mokuro: solo hay imágenes que descargar
        if (foundBook.format === "images") {
            if (!fs.existsSync(imagesFolderPath)) throw new NotFoundException();

            await streamZipToResponse(
                res,
                [
                    {kind: "directory", path: imagesFolderPath, name: foundBook.imagesFolder}
                ],
                `${foundBook.sortName}.zip`
            );

            return;
        }

        const htmlPath = resolveInside(exteriorRoot, "mangas", foundBook.seriePath, `${foundBook.path}.html`);

        if (!fs.existsSync(imagesFolderPath) || !fs.existsSync(htmlPath)) throw new NotFoundException();

        await streamZipToResponse(
            res,
            [
                {kind: "directory", path: imagesFolderPath, name: foundBook.imagesFolder},
                {kind: "file", path: htmlPath, name: `${foundBook.path}.html`}
            ],
            `${foundBook.sortName}.zip`
        );
    }
}
