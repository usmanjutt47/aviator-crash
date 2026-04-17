import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.scss";
import App from "./app";
import { Provider } from "./context";

createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <Routes>
      <Route
        path="*"
        element={
          <Provider>
            <App />
          </Provider>
        }
      />
    </Routes>
  </BrowserRouter>,
);
