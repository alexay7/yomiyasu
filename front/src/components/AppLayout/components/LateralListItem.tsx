import React, {LiHTMLAttributes} from "react";
import {useNavigate} from "react-router-dom";
import {goTo} from "../../../helpers/helpers";

interface LateralListItemProps extends LiHTMLAttributes<HTMLLIElement> {
    text:string;
    link?:string;
    Icon:React.ElementType;
    toggleMenu?:()=>void;
}

export function LateralListItem(props:LateralListItemProps):React.ReactElement {
    const {text, link, Icon, toggleMenu, ...moreProps} = props;

    const navigate = useNavigate();

    let backColor = "hover:bg-[#444444]";

    let active = false;
    if (window.location.pathname === link) active = true;

    if (active) backColor = "bg-[#666666] hover:bg-[#666666]";

    return (
        <li className={`${backColor} list-none w-full flex items-center text-white justify-around py-4 duration-100 cursor-pointer`}
            onClick={()=>{
                if (link && window.location.pathname === link) window.location.href = link;
                if (link && toggleMenu) {
                    toggleMenu();
                    goTo(navigate, link);
                }
            }}
            {...moreProps}
        >
            <div className="w-1/3 flex justify-center">
                <Icon/>
            </div>
            <p className="w-2/3">{text}</p>
        </li>
    );
}