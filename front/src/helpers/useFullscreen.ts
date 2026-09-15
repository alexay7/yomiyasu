import {useCallback, useEffect, useState} from "react";

export function useFullscreen():{isFullscreen:boolean, toggleFullscreen:()=>void} {
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    useEffect(()=>{
        function handleChange():void {
            setIsFullscreen(!!document.fullscreenElement);
        }

        document.addEventListener("fullscreenchange", handleChange);

        return ()=>document.removeEventListener("fullscreenchange", handleChange);
    }, []);

    const toggleFullscreen = useCallback(():void => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else if (document.documentElement.requestFullscreen) {
            void document.documentElement.requestFullscreen();
        }
    }, []);

    return {isFullscreen, toggleFullscreen};
}
