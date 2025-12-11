import { useContext } from "react";
import { ToastContext } from "../contexts/ToastContext.jsx";

export const useToast = () => useContext(ToastContext);
