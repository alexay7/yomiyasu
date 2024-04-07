import {Controller, Get, Inject, Req, UnauthorizedException, UseGuards, Query, Param, HttpStatus, Patch, Body, NotFoundException, UseInterceptors, Res, BadRequestException, StreamableFile, InternalServerErrorException} from "@nestjs/common";
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
import {join} from "path";
import {CacheInterceptor, CacheTTL, CACHE_MANAGER} from "@nestjs/cache-manager";
import {Cache} from "cache-manager";
import * as path from "path";
import * as archiver from "archiver";
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

        return {status:"ok"};
    }

    @Get("book/:id")
    @UseInterceptors(CacheInterceptor)
    @ApiOkResponse({status:HttpStatus.OK})
    async getBook(@Param("id") book:Types.ObjectId) {
        return this.booksService.findById(book);
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
    async downloadZip(@Res({passthrough:true}) res:Response, @Param("bookId", ParseObjectIdPipe) book:Types.ObjectId) {
        
        const foundBook = await this.booksService.findById(book);

        if (foundBook?.variant === "novela") {
            const sourceFolderPath = path.join(__dirname, "..", "..", "..", "exterior", "novelas", foundBook?.seriePath);

            // Send the epub file
            res.setHeader("Content-Type", "application/epub+zip");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=${encodeURI(foundBook.path)}.epub`
            );

            const readStream = fs.createReadStream(path.join(sourceFolderPath, foundBook.path + ".epub"));

            return new StreamableFile(readStream);
        }

        if (!foundBook?.seriePath || !foundBook.path) throw new BadRequestException();

        const sourceFolderPath = path.join(__dirname, "..", "..", "..", "exterior", "mangas", foundBook?.seriePath);

        try {
        // Crear un archivo ZIP
            const folderPath = path.join(sourceFolderPath, foundBook?.imagesFolder);
            const zipFileName = `${foundBook.sortName}.zip`;
            const zipFilePath = path.join(__dirname, "..", "..", "..", "exterior", zipFileName);
  
            // Create a write stream to the zip file
            const output = fs.createWriteStream(zipFilePath);
  
            // Create a new archiver instance
            const archive = archiver("zip", {
                zlib: {level: 9} // Compression level (0-9)
            });
  
            // Pipe the archive to the output stream
            archive.pipe(output);
  
            // Add the entire folder to the archive
            archive.directory(folderPath, foundBook.imagesFolder);
            archive.file(path.join(sourceFolderPath, foundBook.path + ".html"), {name:foundBook.path + ".html"});
  
            // Finalize the archive
            await archive.finalize();
  
            // Set the response headers
            res.setHeader("Content-Type", "application/zip");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=${zipFileName}`
            );
  
            const readStream = fs.createReadStream(zipFilePath);

            readStream.on("close", async()=>{
                await fs.unlink(zipFilePath);
            });

            return new StreamableFile(readStream);
        } catch (error) {
            console.error("Error al crear y enviar el archivo ZIP:", error);
            throw new InternalServerErrorException();
        }
    }
}
