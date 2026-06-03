
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ensureAppVersion, setupVersionWatcher } from "./lib/app-version-guard";

ensureAppVersion();
setupVersionWatcher();

createRoot(document.getElementById("root")!).render(<App />);