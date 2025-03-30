import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { FinanceProvider } from "./lib/context";

createRoot(document.getElementById("root")!).render(
  <FinanceProvider>
    <App />
  </FinanceProvider>
);
