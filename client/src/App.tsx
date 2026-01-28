import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import Dashboard from "@/pages/Dashboard";
import Attendance from "@/pages/Attendance";
import ImportData from "@/pages/ImportData";
import SpecialCases from "@/pages/SpecialCases";
import Reports from "@/pages/Reports";
import Employees from "@/pages/Employees";
import Missions from "@/pages/Missions";
import Leaves from "@/pages/Leaves";
import NotFound from "@/pages/not-found";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden rtl-grid">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto pb-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/attendance" component={Attendance} />
        <Route path="/missions" component={Missions} />
        <Route path="/leaves" component={Leaves} />
        <Route path="/import" component={ImportData} />
        <Route path="/special-cases" component={SpecialCases} />
        <Route path="/reports" component={Reports} />
        <Route path="/employees" component={Employees} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
