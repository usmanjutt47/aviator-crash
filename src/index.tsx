import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.scss";
import App from "./app";
import Admin from "./components/Admin";
import { Provider } from "./context";

createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <Provider>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </Provider>
  </BrowserRouter>,
);
