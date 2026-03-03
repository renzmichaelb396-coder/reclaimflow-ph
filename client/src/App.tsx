import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { Route, Switch } from "wouter";

// Pages
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import ProjectsList from "@/pages/ProjectsList";
import ProjectIntake from "@/pages/ProjectIntake";
import ProjectDetail from "@/pages/ProjectDetail";
import PreQualification from "@/pages/PreQualification";
import Evaluation from "@/pages/Evaluation";
import BoardManagement from "@/pages/BoardManagement";
import BiddingWorkflow from "@/pages/BiddingWorkflow";
import AgreementExecution from "@/pages/AgreementExecution";
import Monitoring from "@/pages/Monitoring";
import Enforcement from "@/pages/Enforcement";
import DocumentManagement from "@/pages/DocumentManagement";
import AgencyCoordination from "@/pages/AgencyCoordination";
import Reports from "@/pages/Reports";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" switchable={false}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/projects" component={ProjectsList} />
        <Route path="/projects/new" component={ProjectIntake} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/projects/:id/pre-qualification" component={PreQualification} />
        <Route path="/projects/:id/evaluation" component={Evaluation} />
        <Route path="/projects/:id/board" component={BoardManagement} />
        <Route path="/projects/:id/bidding" component={BiddingWorkflow} />
        <Route path="/projects/:id/agreement" component={AgreementExecution} />
        <Route path="/projects/:id/monitoring" component={Monitoring} />
        <Route path="/projects/:id/enforcement" component={Enforcement} />
        <Route path="/projects/:id/documents" component={DocumentManagement} />
        <Route path="/projects/:id/agency" component={AgencyCoordination} />
        <Route path="/reports" component={Reports} />
        <Route path="/admin" component={AdminPanel} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </ThemeProvider>
  );
}
