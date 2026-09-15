import React, {useEffect, useRef, useState} from "react";

interface LazySectionProps {
    children:React.ReactNode;
    rootMargin?:string;
    placeholderHeight?:number;
}

/**
 * Monta sus hijos solo cuando están a punto de entrar en pantalla.
 * Se usa en Home para no lanzar las peticiones de las secciones que
 * quedan por debajo del pliegue.
 */
export function LazySection({children, rootMargin = "200px", placeholderHeight = 300}:LazySectionProps):React.ReactElement {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(()=>{
        if (visible || !ref.current) return;

        if (!("IntersectionObserver" in window)) {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver((entries)=>{
            entries.forEach((entry)=>{
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            });
        }, {rootMargin});

        observer.observe(ref.current);

        return ()=>observer.disconnect();
    }, [visible, rootMargin]);

    return (
        <div ref={ref} style={visible ? undefined : {minHeight: placeholderHeight}}>
            {visible ? children : null}
        </div>
    );
}
