import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "./index.css";
import { router } from "./routes";
import { ApiProvider } from "./web/api/context";
import { httpApiClient } from "./web/api/client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApiProvider client={httpApiClient}>
      <RouterProvider router={router} />
    </ApiProvider>
  </StrictMode>,
);
