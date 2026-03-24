import { FlowCanvas } from "./components/FlowCanvas";
import { EventsLog } from "./components/EventsLog";
import { Inspector } from "./components/Inspector";
import { Palette } from "./components/Palette";
import { Toast } from "./components/Toast";
import { Toolbar } from "./components/Toolbar";

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Palette />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <FlowCanvas />
          </div>
          <EventsLog />
        </div>
        <Inspector />
      </div>
      <Toast />
    </div>
  );
}
