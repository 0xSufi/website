import { Outlet } from "react-router-dom";
import React from "react";

import "react-toastify/dist/ReactToastify.css";
import { Provider } from "./components/ui/provider";

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <Provider>
      <Header />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
      <Footer />
    </Provider>
  );
}

export default App;
