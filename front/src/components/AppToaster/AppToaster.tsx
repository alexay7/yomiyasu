import {ToastContainer} from "react-toastify";
import {useIsDarkMode} from "../../lib/colorMode";

/** Toasts de la aplicación, con el tema del modo de color activo. */
export function AppToaster():React.ReactElement {
  const isDark = useIsDarkMode();

  return (
    <ToastContainer
      theme={isDark ? "dark" : "light"}
      position="top-right"
      autoClose={4000}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss={false}
    />
  );
}
