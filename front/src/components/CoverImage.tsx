import {useEffect, useState} from "react";
import {thumbUrl} from "../lib/media";

type CoverImageProps = Omit<React.ComponentProps<"img">, "src"> & {
  src: string;
};

/**
 * Portada que pide primero la miniatura (webp 480px generado en
 * `exterior/thumbnails/`) y cae a la imagen original si todavía no existe.
 */
export function CoverImage({src, onError, ...props}:CoverImageProps):React.ReactElement {
  const [failed, setFailed] = useState(false);

  useEffect(()=>{
    setFailed(false);
  }, [src]);

  return (
    <img
      {...props}
      src={failed ? src : thumbUrl(src)}
      onError={(event)=>{
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
