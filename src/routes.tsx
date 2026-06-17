import { createHashRouter, Navigate } from "react-router";
import { HomePage } from "./web/pages/HomePage";
import { ArticlePage } from "./web/pages/ArticlePage";

export const router = createHashRouter([
  { path: "/", element: <Navigate to="/home" replace /> },
  { path: "/home", element: <HomePage /> },
  { path: "/articles/:id", element: <ArticlePage /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
