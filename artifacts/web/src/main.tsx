import { createRoot } from "react-dom/client";
import App from "./App";
import { ArqonI18nProvider } from "@/lib/i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ArqonI18nProvider>
    <App />
  </ArqonI18nProvider>
);
