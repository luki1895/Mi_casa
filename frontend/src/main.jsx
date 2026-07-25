import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { SistemaProvider } from "./context/SistemaContext";

ReactDOM.createRoot(document.getElementById("root")).render(

    <React.StrictMode>

        <AuthProvider>

            <SistemaProvider>

                <App />

            </SistemaProvider>

        </AuthProvider>

    </React.StrictMode>

);