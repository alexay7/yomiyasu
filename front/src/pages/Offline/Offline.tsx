import {FolderOpen, WifiOff} from "lucide-react";
import React, {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router";
import {Button} from "../../ui/Button";
import {useTitle} from "../../lib/useTitle";
import Reader from "../Reader/Reader";

const FileUploader: React.FC = () => {
    const navigate = useNavigate();

    const [htmlBlobUrl, setHtmlBlobUrl] = useState<string>("");
    const [filesMap, setFilesMap] = useState<Record<string, File>>({});
    const [pages, setPages] = useState<number>(1);
    const [name, setName] = useState("");
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const objectUrlsRef = useRef<string[]>([]);

    useTitle("Lector local");

    // Libera los blobs creados al desmontar o al cargar otra carpeta
    const revokeObjectUrls = ():void => {
        objectUrlsRef.current.forEach((url)=>URL.revokeObjectURL(url));
        objectUrlsRef.current = [];
    };

    useEffect(()=>revokeObjectUrls, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>):void => {
        const files = event.target.files;
        if (!files) return;

        revokeObjectUrls();
        setHtmlBlobUrl("");

        const fileMap: Record<string, File> = {};

        // Create a map of file paths to file objects
        for (const file of Array.from(files)) {
            const pathWithoutRoot = file.webkitRelativePath.split("/").slice(1).join("/");
            fileMap[pathWithoutRoot] = file;
        }

        setFilesMap(fileMap);

        // Find the HTML file and read its content
        const htmlFile = Array.from(files).find((file) => file.name.endsWith(".html"));

        if (htmlFile) {
            setName(htmlFile.name.replace(".html", ""));
            const reader = new FileReader();

            reader.onload = () => {
                const blob = new Blob([reader.result as string], { type: "text/html" });
                const url = URL.createObjectURL(blob);

                objectUrlsRef.current.push(url);
                setHtmlBlobUrl(url);
            };

            reader.readAsText(htmlFile);
        }
    };

    const handleIframeLoad = ():void => {
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;

        const divs = iframeDoc.getElementsByClassName("pageContainer");

        setPages(divs.length);

        for (const div of Array.from(divs)) {
            const style = (div as HTMLDivElement).style;
            const backgroundImage = style.backgroundImage;
            const urlMatch = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);

            if (urlMatch && urlMatch[1]) {
                const imagePath = decodeURIComponent(urlMatch[1]);

                if (filesMap[imagePath]) {
                    const imageUrl = URL.createObjectURL(filesMap[imagePath]);
                    objectUrlsRef.current.push(imageUrl);
                    style.backgroundImage = `url("${imageUrl}")`;
                }
            }
        }
    };

    return (
        <div>
            {htmlBlobUrl ? (
                <Reader
                    type="local"
                    localHtml={htmlBlobUrl}
                    pages={pages}
                    iframeOnLoad={handleIframeLoad}
                    localIframe={iframeRef}
                    name={name}
                    resetBook={()=>setHtmlBlobUrl("")}
                />
            ) : (
                <div className="flex h-[100svh] flex-col items-center justify-center gap-5 bg-app-bg px-4 text-center">
                    <span className="flex size-16 items-center justify-center rounded-full bg-tint text-primary">
                        <WifiOff className="size-8" strokeWidth={1.5} />
                    </span>

                    <div className="flex flex-col gap-1">
                        <h1 className="text-xl font-bold text-fg">Lector local</h1>
                        <p className="max-w-md text-sm text-fg-muted">
                            Selecciona una carpeta con un manga &quot;mokureado&quot;. Debe contener un archivo
                            <span className="font-medium text-fg"> .html </span>
                            y una subcarpeta con las imágenes.
                        </p>
                    </div>

                    <Button
                        icon={<FolderOpen className="size-4" />}
                        onClick={()=>inputRef.current?.click()}
                    >
                        Elegir carpeta
                    </Button>
                    <input hidden ref={inputRef} type="file" webkitdirectory="true" multiple onChange={handleFileChange} />

                    <p className="text-xs text-fg-muted">
                        No se guardará tu progreso ni se añadirá el libro a tus estadísticas.
                    </p>

                    <Button variant="ghost" onClick={()=>navigate("/")}>
                        Volver atrás
                    </Button>
                </div>
            )}
        </div>
    );
};

export default FileUploader;
