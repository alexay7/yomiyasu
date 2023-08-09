export function setCookie(name:string, value:string, hours:number):void {
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + (hours * 60 * 60 * 1000)); // Convert hours to milliseconds

    const expires = `expires=${  expirationDate.toUTCString()}`;
    document.cookie = `${name  }=${  value  };${  expires  };path=/`;
}

export function getCookie(name:string):string | null {
    const cookieName = `${name  }=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(";");

    for (let i = 0; i < cookieArray.length; i++) {
        const cookie = cookieArray[i].trim();
        if (cookie.indexOf(cookieName) === 0) {
            return cookie.substring(cookieName.length, cookie.length);
        }
    }

    return null;
}