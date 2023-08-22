import {Slider, styled} from "@mui/material";

export const InversedSlider = styled(Slider)(({theme}) => ({
    color: "var(--primary-color)",
    height: 3,
    padding: "13px 0",
    "& .MuiSlider-thumb": {
        marginRight: -20,
        marginLeft: 0
    },
    "& .MuiSlider-track": {
        background: "var(--primary-color)",
        borderColor: "var(--primary-color)",
        height: 4,
        zIndex:5
    },
    "& .MuiSlider-rail": {
        color: "transparent",
        opacity: theme.palette.mode === "dark" ? undefined : 1,
        height: 3
    },
    "& .MuiSlider-mark":{
        background: "white",
        width:5,
        height:5,
        borderRadius:"9999px"
    }
}));