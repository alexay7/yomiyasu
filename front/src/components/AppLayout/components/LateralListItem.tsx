import React, {LiHTMLAttributes} from "react";
import {useNavigate} from "react-router-dom";
import {goTo} from "../../../helpers/helpers";
import {useMediaQuery} from "react-responsive";

interface LateralListItemProps extends LiHTMLAttributes<HTMLLIElement> {
    text:string;
    link?:string;
    Icon:React.ElementType;
    toggleMenu?:()=>void;
    category?:boolean;
    sub?:boolean;
}

export function LateralListItem(props:LateralListItemProps):React.ReactElement {
    const {text, link, Icon, toggleMenu, className, category, sub, ...moreProps} = props;

    const navigate = useNavigate();
    const isTabletOrMobile = useMediaQuery({query: "(max-width: 1224px)"});

    let backColor = "dark:hover:bg-[#444444] hover:bg-gray-200";

    let active = false;
    if (!category && window.location.pathname === link) active = true;

    if (active) backColor = "dark:bg-[#666666] dark:hover:bg-[#666666] bg-gray-200 hover:bg-gray-200";

    return (
        <li className={`${backColor} list-none w-full flex items-center text-gray-800 dark:text-white justify-around py-4 duration-100 cursor-pointer ${className}`}
            onClick={()=>{
                if (link && window.location.pathname === link) window.location.href = link;
                if (link && toggleMenu) {
                    if (isTabletOrMobile) toggleMenu();
                    goTo(navigate, link);
                }
            }}
            {...moreProps}
        >
            <div className={`w-1/3 flex justify-center ${sub ? "pl-6" : ""}`}>
                <Icon/>
            </div>
            <p className="w-2/3">{text}</p>
        </li>
    );
}