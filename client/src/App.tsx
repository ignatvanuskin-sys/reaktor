import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const image = new Image();
    let opened = false;
    const reveal = () => {
      if (opened) return;
      opened = true;
      window.setTimeout(() => setReady(true), 120);
    };
    image.onload = reveal;
    image.onerror = reveal;
    const source = window.matchMedia("(max-width: 560px)").matches
      ? "/images/reaktor-hero-640_a6829983.webp"
      : window.matchMedia("(max-width: 960px)").matches
        ? "/images/reaktor-hero-960_d30daf07.webp"
        : "/images/reaktor-hero-1920_cf744d3a.webp";
    image.src = source;
    if (image.complete) reveal();
    return () => { image.onload = null; image.onerror = null; };
  }, []);
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <div className={`app-stage ${ready ? "is-ready" : ""}`}><Router /></div>
          {!ready && <div className="site-loader" role="status" aria-label="Загрузка сайта"><div className="loader-mark"><span>R</span></div><p>РЕАКТОР</p><small>ЗАПУСКАЕМ СЕРВИС</small><div className="loader-line"><i /></div></div>}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
