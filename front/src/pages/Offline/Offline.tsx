import React, { useState, useRef } from "react";
import Reader from "../Reader/Reader";
import { Button, IconButton } from "@mui/material";
import { UploadFile } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const FileUploader: React.FC = () => {
    const navigate = useNavigate()

  const [htmlBlobUrl, setHtmlBlobUrl] = useState<string>("");
  const [filesMap, setFilesMap] = useState<Record<string, File>>({});
  const [pages, setPages] = useState<number>(1);
  const [name, setName] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

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

        setHtmlBlobUrl(url);
      };
      reader.readAsText(htmlFile);
    }
  };

  const handleIframeLoad = () => {
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
          resetBook={() => setHtmlBlobUrl("")}
        />
      ) : (
        <div className="flex justify-center items-center h-screen text-white flex-col gap-4">
          <IconButton
            onClick={() => {
              if (inputRef.current) inputRef.current.click();
            }}
            className="flex flex-col animate-pulse border-4 border-primary border-solid bg-white p-4"
          >
            <UploadFile className="h-20 w-20 text-primary" />
            <input hidden ref={inputRef} type="file" webkitdirectory="true" multiple onChange={handleFileChange} />
          </IconButton>
          <button className="bg-transparent border-none cursor-pointer" onClick={()=>{
              if (inputRef.current) inputRef.current.click();
          }}>
          <h1 className="text-primary">Click aquí para cargar una carpeta</h1>
          </button>
          <div className="flex flex-col text-center w-[400px] items-center gap-2">
              <p className="text-2xl font-semibold">Selecciona una carpeta con un manga &quot;mokureado&quot;</p>
              <p className="text-sm w-2/3">
                La carpeta deberá contener un archivo .html y una subcarpeta donde deberán estar las imágenes del manga
              </p>
            </div>
            <div className="flex flex-col">
              <p className="text-xs">(No se guardará tu progreso ni se añadirá el libro a tus estadísticas)</p>
            </div>
            <Button variant="outlined" onClick={()=>navigate("/")}>
                Volver atrás
            </Button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
