import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";
import "./styles/windows-chrome-fixes.css";
import App from "./App";
import Portfolio from "./pages/Portfolio";
import Splash from "./pages/Splash";
import Team from "./pages/Team";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/splash" replace />,
      },
      {
        path: "portfolio",
        element: <Portfolio />,
      },
      {
        path: "splash",
        element: <Splash />,
      },
      {
        path: "team",
        element: <Team />,
      },
    ],
  },
]);


ReactDOM.createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
