import { AppShell } from "./app/AppShell";
import { TitleBar } from "./components/TitleBar";

function App() {
  return (
    <div className="flex h-full flex-col bg-surface-0">
      <TitleBar />
      <div className="min-h-0 flex-1">
        <AppShell />
      </div>
    </div>
  );
}

export default App;
