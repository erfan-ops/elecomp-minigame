import { AppSessionProvider, useAppSession } from "./AppSession";
import { APP_ROUTES } from "./routes";

function AppContent() {
  const { phase } = useAppSession();
  const route = APP_ROUTES.find((entry) => entry.id === phase) ?? APP_ROUTES[0];
  const Page = route.component;

  return (
    <div className="app" onContextMenu={(event) => event.preventDefault()}>
      <Page />
    </div>
  );
}

export default function App() {
  return (
    <AppSessionProvider>
      <AppContent />
    </AppSessionProvider>
  );
}
