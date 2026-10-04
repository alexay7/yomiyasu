import "reflect-metadata";
import * as archiver from "archiver";
import * as fs from "fs";
import * as path from "path";
import * as mongoose from "mongoose";
import {Types} from "mongoose";

import {BookSchema} from "./books/schemas/book.schema";
import {ReadListSchema} from "./readlist/schemas/readlist.schema";
import {ReadProgressSchema} from "./readprogress/schemas/readprogress.schema";
import {ReviewSchema} from "./reviews/schemas/review.schema";
import {SerieSchema} from "./series/schemas/series.schema";
import {SerieProgressSchema} from "./serieprogress/schemas/serieprogress.schema";
import {UserSchema} from "./users/schemas/user.schema";
import {UserWordsSchema} from "./userwords/schemas/userwords.schema";

type Variant = "manga" | "novela";

interface UserDoc {
    _id: Types.ObjectId;
    username: string;
    email: string;
    admin?: boolean;
}

interface BookDoc {
    _id: Types.ObjectId;
    visibleName: string;
    path: string;
    serie: Types.ObjectId;
    seriePath?: string;
    pages?: number;
    characters?: number;
    variant?: Variant;
}

interface SerieDoc {
    _id: Types.ObjectId;
    visibleName: string;
    path: string;
    variant?: Variant;
    bookCount?: number;
}

interface ReadProgressDoc {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    book: Types.ObjectId;
    serie: Types.ObjectId;
    startDate?: Date;
    lastUpdateDate?: Date;
    endDate?: Date;
    time?: number;
    currentPage?: number;
    status?: string;
    paused?: boolean;
    characters?: number;
    variant?: Variant;
}

interface SerieProgressDoc {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    serie: Types.ObjectId;
    readBooks?: Types.ObjectId[];
    paused?: boolean;
    lastUpdate?: Date;
    variant?: Variant;
}

interface UserWordDoc {
    word: string;
    display: string;
    sentence: string;
    meaning: string[];
    reading: string;
    frequency: number;
    pitch: number[];
    createdAt?: Date;
}

interface UserWordsDoc {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    words?: UserWordDoc[];
}

interface ReviewDoc {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    serie: Types.ObjectId;
    userLevel: string;
    difficulty: number;
    valoration?: number;
    comment?: string;
}

interface ReadListDoc {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    serie: Types.ObjectId;
    addedDate?: Date;
}

interface ZipEntry {
    name: string;
    content: Buffer;
}

const BOM = "\uFEFF";
const SEPARATOR = ";";
const NEWLINE = "\r\n";
const VARIANT_ORDER: Variant[] = ["manga", "novela"];

type CsvValue = string | number | boolean | Date | null | undefined;

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function isoDateTime(value: Date | null | undefined): string {
    if (!value) return "";
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function formatCsvValue(value: CsvValue): string {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return isoDateTime(value);
    if (typeof value === "number") return Number.isFinite(value) ? String(round(value)) : "";
    if (typeof value === "boolean") return value ? "si" : "no";
    return value;
}

function escapeCsvValue(value: CsvValue): string {
    const text = formatCsvValue(value);
    if (text.includes(SEPARATOR) || text.includes('"') || text.includes("\n") || text.includes("\r")) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

class CsvBuilder {
    private readonly rows: string[] = [];

    constructor(header: string[]) {
        this.rows.push(header.map(escapeCsvValue).join(SEPARATOR));
    }

    add(values: CsvValue[]): void {
        this.rows.push(values.map(escapeCsvValue).join(SEPARATOR));
    }

    toBuffer(): Buffer {
        return Buffer.from(BOM + this.rows.join(NEWLINE) + NEWLINE, "utf8");
    }
}

function compareText(a: string, b: string): number {
    return a.localeCompare(b, "es", {sensitivity: "base"});
}

function idOf(value: Types.ObjectId | undefined | null): string {
    return value ? value.toString() : "";
}

function variantOf(progress: ReadProgressDoc, book?: BookDoc, serie?: SerieDoc): Variant | "" {
    return progress.variant ?? book?.variant ?? serie?.variant ?? "";
}

function progressStart(progress: ReadProgressDoc): Date {
    return progress.startDate ?? progress.lastUpdateDate ?? new Date(0);
}

function readPercentage(progress: ReadProgressDoc, book: BookDoc | undefined, variant: Variant | ""): number | "" {
    if (progress.status === "completed") return 100;

    const totalCharacters = book?.characters ?? 0;
    const totalPages = book?.pages ?? 0;

    if (variant === "novela" && totalCharacters > 0) {
        return round(Math.max(0, Math.min(100, ((progress.characters ?? 0) / totalCharacters) * 100)));
    }

    if (totalPages > 0) {
        return round(Math.max(0, Math.min(100, ((progress.currentPage ?? 0) / totalPages) * 100)));
    }

    if (totalCharacters > 0) {
        return round(Math.max(0, Math.min(100, ((progress.characters ?? 0) / totalCharacters) * 100)));
    }

    return "";
}

function readSpeed(characters: number, time: number): number | "" {
    if (time <= 0 || characters <= 0) return "";
    return (characters / time) * 3600;
}

function dayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function dayNumber(date: Date): number {
    return Math.floor(date.getTime() / 86400000);
}

function maxStreak(days: Set<number>): number {
    const sorted = [...days].sort((a, b) => a - b);
    let max = 0;
    let current = 0;
    let previous: number | null = null;

    for (const day of sorted) {
        current = previous !== null && day === previous + 1 ? current + 1 : 1;
        if (current > max) max = current;
        previous = day;
    }

    return max;
}

function currentStreak(days: Set<number>): number {
    if (days.size === 0) return 0;
    const last = Math.max(...days);
    let streak = 0;

    while (days.has(last - streak)) streak++;

    return streak;
}

function loadEnv(): void {
    const candidates = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(__dirname, "..", ".env")
    ];
    const envFile = candidates.find(file => fs.existsSync(file));

    if (!envFile) return;

    for (const rawLine of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) continue;

        const key = line.slice(0, separatorIndex).trim();
        let value = line.slice(separatorIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (process.env[key] === undefined) process.env[key] = value;
    }
}

function getArgument(name: string): string | undefined {
    const args = process.argv.slice(2);
    const inline = args.find(argument => argument.startsWith(`--${name}=`));

    if (inline) return inline.slice(name.length + 3);

    const index = args.indexOf(`--${name}`);
    if (index !== -1) return args[index + 1];

    return undefined;
}

function getModel<T>(name: string, schema: mongoose.Schema, collection: string): mongoose.Model<T> {
    const existing = mongoose.models[name] as mongoose.Model<T> | undefined;
    if (existing) return existing;
    return mongoose.model(name, schema, collection) as unknown as mongoose.Model<T>;
}

interface ExportContext {
    users: UserDoc[];
    usersById: Map<string, UserDoc>;
    booksById: Map<string, BookDoc>;
    seriesById: Map<string, SerieDoc>;
    progresses: ReadProgressDoc[];
    seriesProgresses: SerieProgressDoc[];
    userWords: UserWordsDoc[];
    reviews: ReviewDoc[];
    readLists: ReadListDoc[];
}

interface UserAccumulator {
    totalMangaBooks: number;
    totalNovelaBooks: number;
    mangaSeries: Set<string>;
    novelaSeries: Set<string>;
    startedBooks: Set<string>;
    readingBooks: number;
    totalPages: number;
    totalCharacters: number;
    totalTime: number;
    reads: number;
    firstActivity?: number;
    lastActivity?: number;
}

interface VariantAccumulator {
    booksCompleted: number;
    seriesCompleted: Set<string>;
    startedBooks: Set<string>;
    pages: number;
    characters: number;
    time: number;
    firstActivity?: number;
    lastActivity?: number;
}

interface MonthlyBucket {
    userId: string;
    variant: Variant;
    year: number;
    month: number;
    characters: number;
    time: number;
}

interface DailyBucket {
    userId: string;
    day: string;
    updates: number;
    books: Set<string>;
}

interface ReadingRow {
    progress: ReadProgressDoc;
    userId: string;
    book?: BookDoc;
    serie?: SerieDoc;
    variant: Variant | "";
    attempt: number;
}

interface SerieRow {
    userId: string;
    serieId: string;
    variant: Variant | "";
    readBooks: number;
    paused: boolean;
    lastUpdate?: Date;
    inList: boolean;
    listDate?: Date;
}

function createUserAccumulator(): UserAccumulator {
    return {
        totalMangaBooks: 0,
        totalNovelaBooks: 0,
        mangaSeries: new Set<string>(),
        novelaSeries: new Set<string>(),
        startedBooks: new Set<string>(),
        readingBooks: 0,
        totalPages: 0,
        totalCharacters: 0,
        totalTime: 0,
        reads: 0
    };
}

function createVariantAccumulator(): VariantAccumulator {
    return {
        booksCompleted: 0,
        seriesCompleted: new Set<string>(),
        startedBooks: new Set<string>(),
        pages: 0,
        characters: 0,
        time: 0
    };
}

function updateActivityRange(target: {firstActivity?: number; lastActivity?: number}, start?: Date, end?: Date): void {
    if (start) {
        const value = start.getTime();
        if (target.firstActivity === undefined || value < target.firstActivity) target.firstActivity = value;
    }

    if (end) {
        const value = end.getTime();
        if (target.lastActivity === undefined || value > target.lastActivity) target.lastActivity = value;
    }
}

function buildExport(context: ExportContext): ZipEntry[] {
    const accumulators = new Map<string, UserAccumulator>();
    const variantAccumulators = new Map<string, VariantAccumulator>();
    const activityDays = new Map<string, Set<number>>();
    const variantActivityDays = new Map<string, Set<number>>();
    const monthly = new Map<string, MonthlyBucket>();
    const daily = new Map<string, DailyBucket>();
    const attempts = new Map<string, number>();

    const progressesByUserBook = new Map<string, ReadProgressDoc[]>();

    for (const progress of context.progresses) {
        const key = `${idOf(progress.user)}|${idOf(progress.book)}`;
        const group = progressesByUserBook.get(key) ?? [];
        group.push(progress);
        progressesByUserBook.set(key, group);
    }

    for (const group of progressesByUserBook.values()) {
        group.sort((a, b) => progressStart(a).getTime() - progressStart(b).getTime());
        group.forEach((progress, index) => attempts.set(idOf(progress._id), index + 1));
    }

    for (const progress of context.progresses) {
        const userId = idOf(progress.user);
        const book = context.booksById.get(idOf(progress.book));
        const serie = context.seriesById.get(idOf(progress.serie));
        const variant = variantOf(progress, book, serie);
        const status = progress.status ?? "unread";
        const time = progress.time ?? 0;
        const characters = progress.characters ?? 0;

        if (!accumulators.has(userId)) accumulators.set(userId, createUserAccumulator());
        const accumulator = accumulators.get(userId) as UserAccumulator;

        const dailyKey = progress.lastUpdateDate ? `${userId}|${dayKey(progress.lastUpdateDate)}` : undefined;
        if (dailyKey && progress.lastUpdateDate) {
            if (!daily.has(dailyKey)) {
                daily.set(dailyKey, {
                    userId,
                    day: dayKey(progress.lastUpdateDate),
                    updates: 0,
                    books: new Set<string>()
                });
            }
            const bucket = daily.get(dailyKey) as DailyBucket;
            bucket.updates++;
            bucket.books.add(idOf(progress.book));

            const day = dayNumber(progress.lastUpdateDate);
            if (!activityDays.has(userId)) activityDays.set(userId, new Set<number>());
            (activityDays.get(userId) as Set<number>).add(day);

            if (variant) {
                const variantDaysKey = `${userId}|${variant}`;
                if (!variantActivityDays.has(variantDaysKey)) variantActivityDays.set(variantDaysKey, new Set<number>());
                (variantActivityDays.get(variantDaysKey) as Set<number>).add(day);
            }
        }

        if (time > 0 && progress.endDate && variant) {
            const monthKey = `${userId}|${variant}|${progress.endDate.getUTCFullYear()}-${progress.endDate.getUTCMonth() + 1}`;
            if (!monthly.has(monthKey)) {
                monthly.set(monthKey, {
                    userId,
                    variant,
                    year: progress.endDate.getUTCFullYear(),
                    month: progress.endDate.getUTCMonth() + 1,
                    characters: 0,
                    time: 0
                });
            }
            const bucket = monthly.get(monthKey) as MonthlyBucket;
            bucket.characters += characters;
            bucket.time += time;
        }

        if (status === "unread") continue;

        accumulator.reads++;
        accumulator.totalPages += progress.currentPage ?? 0;
        accumulator.totalCharacters += characters;
        accumulator.totalTime += time;
        accumulator.startedBooks.add(idOf(progress.book));
        updateActivityRange(accumulator, progress.startDate, progress.lastUpdateDate);

        if (status === "reading") accumulator.readingBooks++;

        if (status === "completed") {
            if (variant === "manga") {
                accumulator.totalMangaBooks++;
                accumulator.mangaSeries.add(idOf(progress.serie));
            } else if (variant === "novela") {
                accumulator.totalNovelaBooks++;
                accumulator.novelaSeries.add(idOf(progress.serie));
            }
        }

        if (variant) {
            const variantKey = `${userId}|${variant}`;
            if (!variantAccumulators.has(variantKey)) variantAccumulators.set(variantKey, createVariantAccumulator());
            const variantAccumulator = variantAccumulators.get(variantKey) as VariantAccumulator;

            variantAccumulator.startedBooks.add(idOf(progress.book));
            variantAccumulator.pages += progress.currentPage ?? 0;
            variantAccumulator.characters += characters;
            variantAccumulator.time += time;
            updateActivityRange(variantAccumulator, progress.startDate, progress.lastUpdateDate);

            if (status === "completed") {
                variantAccumulator.booksCompleted++;
                variantAccumulator.seriesCompleted.add(idOf(progress.serie));
            }
        }
    }

    const serieRows = new Map<string, SerieRow>();

    for (const serieProgress of context.seriesProgresses) {
        const userId = idOf(serieProgress.user);
        const serieId = idOf(serieProgress.serie);
        const serie = context.seriesById.get(serieId);
        const key = `${userId}|${serieId}`;

        serieRows.set(key, {
            userId,
            serieId,
            variant: serieProgress.variant ?? serie?.variant ?? "",
            readBooks: serieProgress.readBooks?.length ?? 0,
            paused: serieProgress.paused === true,
            lastUpdate: serieProgress.lastUpdate,
            inList: false
        });
    }

    for (const readList of context.readLists) {
        const userId = idOf(readList.user);
        const serieId = idOf(readList.serie);
        const serie = context.seriesById.get(serieId);
        const key = `${userId}|${serieId}`;
        const existing = serieRows.get(key);

        if (existing) {
            existing.inList = true;
            existing.listDate = readList.addedDate;
        } else {
            serieRows.set(key, {
                userId,
                serieId,
                variant: serie?.variant ?? "",
                readBooks: 0,
                paused: false,
                inList: true,
                listDate: readList.addedDate
            });
        }
    }

    const wordsByUser = new Map<string, UserWordDoc[]>();
    for (const userWords of context.userWords) {
        wordsByUser.set(idOf(userWords.user), userWords.words ?? []);
    }

    const reviewTotals = new Map<string, {count: number; difficulty: number; valoration: number; valorationCount: number}>();
    for (const review of context.reviews) {
        const userId = idOf(review.user);
        if (!reviewTotals.has(userId)) reviewTotals.set(userId, {count: 0, difficulty: 0, valoration: 0, valorationCount: 0});
        const totals = reviewTotals.get(userId) as {count: number; difficulty: number; valoration: number; valorationCount: number};
        totals.count++;
        totals.difficulty += review.difficulty ?? 0;
        if (review.valoration !== undefined && review.valoration !== null) {
            totals.valoration += review.valoration;
            totals.valorationCount++;
        }
    }

    const seriesByUser = new Map<string, {withReads: number; paused: number; inList: number}>();
    for (const row of serieRows.values()) {
        if (!seriesByUser.has(row.userId)) seriesByUser.set(row.userId, {withReads: 0, paused: 0, inList: 0});
        const totals = seriesByUser.get(row.userId) as {withReads: number; paused: number; inList: number};
        if (row.readBooks > 0) totals.withReads++;
        if (row.paused) totals.paused++;
        if (row.inList) totals.inList++;
    }

    const userName = (userId: string): string => context.usersById.get(userId)?.username ?? `(usuario eliminado ${userId})`;
    const userEmail = (userId: string): string => context.usersById.get(userId)?.email ?? "";

    const resumen = new CsvBuilder([
        "usuario", "email", "admin",
        "libros_completados_manga", "libros_completados_novela",
        "series_completadas_manga", "series_completadas_novela",
        "libros_iniciados", "libros_en_lectura", "relecturas",
        "paginas_leidas", "caracteres_leidos", "tiempo_segundos", "tiempo_horas",
        "velocidad_media_caracteres_hora",
        "series_con_lecturas", "series_pausadas", "series_en_lista",
        "palabras_guardadas", "resenas_escritas", "dificultad_media", "valoracion_media",
        "primera_actividad", "ultima_actividad", "dias_activos",
        "racha_maxima_dias", "racha_actual_dias"
    ]);

    const resumenVariante = new CsvBuilder([
        "usuario", "variante", "libros_completados", "series_completadas", "libros_iniciados",
        "paginas_leidas", "caracteres_leidos", "tiempo_segundos", "tiempo_horas",
        "velocidad_media_caracteres_hora",
        "primera_actividad", "ultima_actividad", "dias_activos", "racha_maxima_dias"
    ]);

    const orphanIds = [...accumulators.keys()].filter(userId => !context.usersById.has(userId));
    const summaryUsers = [
        ...context.users.map(user => ({
            userId: idOf(user._id),
            username: user.username,
            email: user.email,
            admin: user.admin === true
        })),
        ...orphanIds.map(userId => ({
            userId,
            username: userName(userId),
            email: "",
            admin: false
        }))
    ].sort((a, b) => compareText(a.username, b.username));

    for (const user of summaryUsers) {
        const userId = user.userId;
        const accumulator = accumulators.get(userId) ?? createUserAccumulator();
        const days = activityDays.get(userId) ?? new Set<number>();
        const seriesTotals = seriesByUser.get(userId) ?? {withReads: 0, paused: 0, inList: 0};
        const reviewStats = reviewTotals.get(userId);
        const globalSpeed = accumulator.totalTime > 0 ? (accumulator.totalCharacters / accumulator.totalTime) * 3600 : "";

        resumen.add([
            user.username,
            user.email,
            user.admin === true ? "si" : "no",
            accumulator.totalMangaBooks,
            accumulator.totalNovelaBooks,
            accumulator.mangaSeries.size,
            accumulator.novelaSeries.size,
            accumulator.startedBooks.size,
            accumulator.readingBooks,
            Math.max(0, accumulator.reads - accumulator.startedBooks.size),
            accumulator.totalPages,
            accumulator.totalCharacters,
            accumulator.totalTime,
            accumulator.totalTime / 3600,
            globalSpeed,
            seriesTotals.withReads,
            seriesTotals.paused,
            seriesTotals.inList,
            wordsByUser.get(userId)?.length ?? 0,
            reviewStats?.count ?? 0,
            reviewStats && reviewStats.count > 0 ? reviewStats.difficulty / reviewStats.count : "",
            reviewStats && reviewStats.valorationCount > 0 ? reviewStats.valoration / reviewStats.valorationCount : "",
            accumulator.firstActivity !== undefined ? new Date(accumulator.firstActivity) : "",
            accumulator.lastActivity !== undefined ? new Date(accumulator.lastActivity) : "",
            days.size,
            days.size > 0 ? maxStreak(days) : 0,
            days.size > 0 ? currentStreak(days) : 0
        ]);

        for (const variant of VARIANT_ORDER) {
            const variantAccumulator = variantAccumulators.get(`${userId}|${variant}`);
            if (!variantAccumulator) continue;

            const variantDays = variantActivityDays.get(`${userId}|${variant}`) ?? new Set<number>();

            resumenVariante.add([
                user.username,
                variant,
                variantAccumulator.booksCompleted,
                variantAccumulator.seriesCompleted.size,
                variantAccumulator.startedBooks.size,
                variantAccumulator.pages,
                variantAccumulator.characters,
                variantAccumulator.time,
                variantAccumulator.time / 3600,
                variantAccumulator.time > 0 ? (variantAccumulator.characters / variantAccumulator.time) * 3600 : "",
                variantAccumulator.firstActivity !== undefined ? new Date(variantAccumulator.firstActivity) : "",
                variantAccumulator.lastActivity !== undefined ? new Date(variantAccumulator.lastActivity) : "",
                variantDays.size,
                variantDays.size > 0 ? maxStreak(variantDays) : 0
            ]);
        }
    }

    const readingRows: ReadingRow[] = context.progresses.map(progress => {
        const userId = idOf(progress.user);
        const book = context.booksById.get(idOf(progress.book));
        const serie = context.seriesById.get(idOf(progress.serie));

        return {
            progress,
            userId,
            book,
            serie,
            variant: variantOf(progress, book, serie),
            attempt: attempts.get(idOf(progress._id)) ?? 1
        };
    });

    readingRows.sort((a, b) => {
        const user = compareText(userName(a.userId), userName(b.userId));
        if (user !== 0) return user;

        const variant = compareText(a.variant, b.variant);
        if (variant !== 0) return variant;

        const serie = compareText(a.serie?.visibleName ?? "", b.serie?.visibleName ?? "");
        if (serie !== 0) return serie;

        const book = compareText(a.book?.visibleName ?? "", b.book?.visibleName ?? "");
        if (book !== 0) return book;

        return a.attempt - b.attempt;
    });

    const lecturas = new CsvBuilder([
        "usuario", "email", "variante", "serie", "tomo", "ruta_serie", "ruta_libro",
        "estado", "intento",
        "fecha_inicio", "fecha_ultima_actualizacion", "fecha_fin",
        "tiempo_segundos", "tiempo_horas",
        "pagina_actual", "paginas_totales", "porcentaje",
        "caracteres_leidos", "caracteres_totales_libro",
        "velocidad_caracteres_hora", "pausado"
    ]);

    for (const row of readingRows) {
        const progress = row.progress;
        const time = progress.time ?? 0;
        const characters = progress.characters ?? 0;

        lecturas.add([
            userName(row.userId),
            userEmail(row.userId),
            row.variant,
            row.serie?.visibleName ?? "",
            row.book?.visibleName ?? "",
            row.serie?.path ?? row.book?.seriePath ?? "",
            row.book?.path ?? "",
            progress.status ?? "unread",
            row.attempt,
            progress.startDate ?? "",
            progress.lastUpdateDate ?? "",
            progress.endDate ?? "",
            time,
            time / 3600,
            progress.currentPage ?? "",
            row.book?.pages ?? "",
            readPercentage(progress, row.book, row.variant),
            characters,
            row.book?.characters ?? "",
            readSpeed(characters, time),
            progress.paused === true ? "si" : "no"
        ]);
    }

    const mensual = new CsvBuilder([
        "usuario", "variante", "anio", "mes", "caracteres",
        "tiempo_segundos", "tiempo_horas", "velocidad_media_caracteres_hora"
    ]);

    const monthlyBuckets = [...monthly.values()].sort((a, b) => {
        const user = compareText(userName(a.userId), userName(b.userId));
        if (user !== 0) return user;
        if (a.variant !== b.variant) return compareText(a.variant, b.variant);
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });

    for (const bucket of monthlyBuckets) {
        mensual.add([
            userName(bucket.userId),
            bucket.variant,
            bucket.year,
            bucket.month,
            bucket.characters,
            bucket.time,
            bucket.time / 3600,
            bucket.time > 0 ? (bucket.characters / bucket.time) * 3600 : ""
        ]);
    }

    const actividad = new CsvBuilder(["usuario", "fecha", "actualizaciones", "libros_distintos"]);

    const dailyBuckets = [...daily.values()].sort((a, b) => {
        const user = compareText(userName(a.userId), userName(b.userId));
        if (user !== 0) return user;
        return compareText(a.day, b.day);
    });

    for (const bucket of dailyBuckets) {
        actividad.add([
            userName(bucket.userId),
            bucket.day,
            bucket.updates,
            bucket.books.size
        ]);
    }

    const series = new CsvBuilder([
        "usuario", "variante", "serie", "ruta_serie",
        "libros_leidos", "libros_totales", "libros_restantes",
        "completada", "en_lectura", "pausada",
        "ultima_actualizacion", "en_lista_lectura", "fecha_anadida_lista"
    ]);

    const sortedSerieRows = [...serieRows.values()].sort((a, b) => {
        const user = compareText(userName(a.userId), userName(b.userId));
        if (user !== 0) return user;

        const serie = compareText(context.seriesById.get(a.serieId)?.visibleName ?? "", context.seriesById.get(b.serieId)?.visibleName ?? "");
        if (serie !== 0) return serie;

        return compareText(a.variant, b.variant);
    });

    for (const row of sortedSerieRows) {
        const serie = context.seriesById.get(row.serieId);
        const bookCount = serie?.bookCount ?? 0;
        const completed = bookCount > 0 && row.readBooks >= bookCount;

        series.add([
            userName(row.userId),
            row.variant,
            serie?.visibleName ?? "(serie eliminada)",
            serie?.path ?? "",
            row.readBooks,
            bookCount > 0 ? bookCount : "",
            bookCount > 0 ? Math.max(0, bookCount - row.readBooks) : "",
            completed,
            row.readBooks > 0 && !completed,
            row.paused,
            row.lastUpdate ?? "",
            row.inList,
            row.listDate ?? ""
        ]);
    }

    const lista = new CsvBuilder(["usuario", "variante", "serie", "fecha_anadida"]);

    const sortedReadLists = [...context.readLists].sort((a, b) => {
        const user = compareText(userName(idOf(a.user)), userName(idOf(b.user)));
        if (user !== 0) return user;
        return compareText(
            context.seriesById.get(idOf(a.serie))?.visibleName ?? "",
            context.seriesById.get(idOf(b.serie))?.visibleName ?? ""
        );
    });

    for (const readList of sortedReadLists) {
        const userId = idOf(readList.user);
        const serie = context.seriesById.get(idOf(readList.serie));
        lista.add([
            userName(userId),
            serie?.variant ?? "",
            serie?.visibleName ?? "(serie eliminada)",
            readList.addedDate ?? ""
        ]);
    }

    const palabras = new CsvBuilder([
        "usuario", "palabra", "lectura", "significado", "frase", "frecuencia", "tono", "fecha_alta"
    ]);

    const wordRows: Array<{userId: string; word: UserWordDoc}> = [];
    for (const [userId, words] of wordsByUser.entries()) {
        for (const word of words) wordRows.push({userId, word});
    }

    wordRows.sort((a, b) => {
        const user = compareText(userName(a.userId), userName(b.userId));
        if (user !== 0) return user;

        const dateA = a.word.createdAt ? a.word.createdAt.getTime() : 0;
        const dateB = b.word.createdAt ? b.word.createdAt.getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;

        return compareText(a.word.display ?? a.word.word, b.word.display ?? b.word.word);
    });

    for (const row of wordRows) {
        palabras.add([
            userName(row.userId),
            row.word.display ?? row.word.word,
            row.word.reading ?? "",
            (row.word.meaning ?? []).join(" | "),
            row.word.sentence ?? "",
            row.word.frequency ?? "",
            (row.word.pitch ?? []).join(" | "),
            row.word.createdAt ?? ""
        ]);
    }

    const resenas = new CsvBuilder([
        "usuario", "serie", "variante", "nivel_usuario", "dificultad", "valoracion", "comentario"
    ]);

    const sortedReviews = [...context.reviews].sort((a, b) => {
        const user = compareText(userName(idOf(a.user)), userName(idOf(b.user)));
        if (user !== 0) return user;
        return compareText(
            context.seriesById.get(idOf(a.serie))?.visibleName ?? "",
            context.seriesById.get(idOf(b.serie))?.visibleName ?? ""
        );
    });

    for (const review of sortedReviews) {
        const serie = context.seriesById.get(idOf(review.serie));
        resenas.add([
            userName(idOf(review.user)),
            serie?.visibleName ?? "(serie eliminada)",
            serie?.variant ?? "",
            review.userLevel ?? "",
            review.difficulty ?? "",
            review.valoration ?? "",
            review.comment ?? ""
        ]);
    }

    const generatedAt = isoDateTime(new Date());
    const leeme = [
        "EXPORT DE ESTADISTICAS DE LECTURA - Yomiyasu",
        `Generado: ${generatedAt}`,
        "Origen: base de datos MongoDB del backend (solo lectura)",
        "",
        "CONTENIDO",
        `- resumen_miembros.csv: un miembro por fila con todos los totales agregados (${summaryUsers.length} filas, incluidos los usuarios eliminados que conservan datos).`,
        "- resumen_variante.csv: totales por miembro y variante (manga/novela).",
        `- lecturas.csv: un registro de progreso por fila, con libro, serie, fechas, tiempo, paginas, caracteres y velocidad (${context.progresses.length} filas).`,
        "- mensual.csv: agregado por miembro, variante y mes (solo lecturas con fecha de fin y tiempo > 0).",
        "- actividad_diaria.csv: dias con actividad por miembro (actualizaciones y libros distintos).",
        `- series.csv: progreso por miembro y serie (leidos/totales, completada, pausada, en lista) (${serieRows.size} filas).`,
        `- lista_lectura.csv: series pendientes por miembro (${context.readLists.length} filas).`,
        "- palabras.csv: vocabulario guardado por miembro.",
        `- resenas.csv: resenas de series escritas por los miembros (${context.reviews.length} filas).`,
        "",
        "NOTAS",
        '- Separador de columnas ";" y codificacion UTF-8 con BOM (se abre bien en Excel).',
        "- Fechas en ISO 8601 UTC. Los decimales usan punto.",
        "- Estados de lectura: unread (sin empezar), reading (en lectura), completed (terminado).",
        "- porcentaje: en novelas, caracteres_leidos / caracteres del libro (el lector marca completado al 90%); en manga, pagina actual / paginas.",
        "- velocidad_caracteres_hora = caracteres / tiempo * 3600; vacio si no hay caracteres o tiempo.",
        "- tiempo es acumulativo por registro de progreso; en actividad_diaria.csv 'actualizaciones' cuenta registros tocados ese dia, no tiempo leido ese dia.",
        "- racha_* se calcula con los dias (UTC) con alguna actualizacion de progreso.",
        "- Un miembro sin actividad aparece igualmente en resumen_miembros.csv con totales a 0.",
        "- Los datos de usuarios borrados se conservan y aparecen como '(usuario eliminado <id>)' en todos los ficheros.",
        "- Algunos registros antiguos pueden tener fecha_fin vacia aunque su estado sea completed."
    ].join("\n");

    return [
        {name: "LEEME.txt", content: Buffer.from(leeme, "utf8")},
        {name: "resumen_miembros.csv", content: resumen.toBuffer()},
        {name: "resumen_variante.csv", content: resumenVariante.toBuffer()},
        {name: "lecturas.csv", content: lecturas.toBuffer()},
        {name: "mensual.csv", content: mensual.toBuffer()},
        {name: "actividad_diaria.csv", content: actividad.toBuffer()},
        {name: "series.csv", content: series.toBuffer()},
        {name: "lista_lectura.csv", content: lista.toBuffer()},
        {name: "palabras.csv", content: palabras.toBuffer()},
        {name: "resenas.csv", content: resenas.toBuffer()}
    ];
}

async function writeZip(outputPath: string, entries: ZipEntry[]): Promise<void> {
    await fs.promises.mkdir(path.dirname(outputPath), {recursive: true});

    await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", {zlib: {level: 9}});

        output.on("close", () => resolve());
        output.on("error", reject);
        archive.on("error", reject);
        archive.on("warning", warning => console.warn("Aviso generando el ZIP:", warning.message));

        archive.pipe(output);

        for (const entry of entries) archive.append(entry.content, {name: entry.name});

        void archive.finalize();
    });
}

function defaultOutputPath(): string {
    const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
    return path.resolve(process.cwd(), `estadisticas-yomiyasu-${stamp}.zip`);
}

async function main(): Promise<void> {
    loadEnv();

    const mongoUrl = process.env.MONGOURL;
    if (!mongoUrl) {
        console.error("Falta MONGOURL: definela en back/.env o como variable de entorno.");
        process.exitCode = 1;
        return;
    }

    console.log("Conectando a MongoDB...");
    await mongoose.connect(mongoUrl, {serverSelectionTimeoutMS: 15000});

    try {
        const UserModel = getModel<UserDoc>("User", UserSchema, "users");
        const BookModel = getModel<BookDoc>("Book", BookSchema, "books");
        const SerieModel = getModel<SerieDoc>("Serie", SerieSchema, "series");
        const ReadProgressModel = getModel<ReadProgressDoc>("ReadProgress", ReadProgressSchema, "readprogresses");
        const SerieProgressModel = getModel<SerieProgressDoc>("SerieProgress", SerieProgressSchema, "serieprogresses");
        const UserWordsModel = getModel<UserWordsDoc>("UserWords", UserWordsSchema, "userwords");
        const ReviewModel = getModel<ReviewDoc>("Review", ReviewSchema, "reviews");
        const ReadListModel = getModel<ReadListDoc>("ReadList", ReadListSchema, "readlists");

        console.log("Leyendo datos...");
        const [usersRaw, booksRaw, seriesRaw, progressesRaw, seriesProgressesRaw, userWordsRaw, reviewsRaw, readListsRaw] = await Promise.all([
            UserModel.find({}, {password: 0, refreshToken: 0}).lean(),
            BookModel.find({}).lean(),
            SerieModel.find({}).lean(),
            ReadProgressModel.find({}).sort({user: 1, lastUpdateDate: 1}).lean(),
            SerieProgressModel.find({}).lean(),
            UserWordsModel.find({}).lean(),
            ReviewModel.find({}).lean(),
            ReadListModel.find({}).lean()
        ]);

        const users = usersRaw as unknown as UserDoc[];
        const books = booksRaw as unknown as BookDoc[];
        const series = seriesRaw as unknown as SerieDoc[];
        const progresses = progressesRaw as unknown as ReadProgressDoc[];
        const seriesProgresses = seriesProgressesRaw as unknown as SerieProgressDoc[];
        const userWords = userWordsRaw as unknown as UserWordsDoc[];
        const reviews = reviewsRaw as unknown as ReviewDoc[];
        const readLists = readListsRaw as unknown as ReadListDoc[];

        const context: ExportContext = {
            users,
            usersById: new Map(users.map(user => [idOf(user._id), user])),
            booksById: new Map(books.map(book => [idOf(book._id), book])),
            seriesById: new Map(series.map(serie => [idOf(serie._id), serie])),
            progresses,
            seriesProgresses,
            userWords,
            reviews,
            readLists
        };

        console.log("Generando CSV...");
        const entries = buildExport(context);

        const outputPath = path.resolve(getArgument("out") ?? defaultOutputPath());
        await writeZip(outputPath, entries);

        const size = fs.statSync(outputPath).size;
        console.log(`Export generado: ${outputPath} (${(size / 1024).toFixed(1)} KB)`);
        console.log(`Miembros: ${users.length} | Progresos: ${progresses.length} | Series con progreso: ${seriesProgresses.length} | Palabras: ${userWords.reduce((total, entry) => total + (entry.words?.length ?? 0), 0)} | Resenas: ${reviews.length} | Lista de lectura: ${readLists.length}`);
    } finally {
        await mongoose.disconnect();
    }
}

void main().catch(error => {
    console.error("Error generando el export:", error);
    process.exitCode = 1;
});
