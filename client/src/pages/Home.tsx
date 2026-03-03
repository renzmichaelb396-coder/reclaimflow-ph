import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { ArrowRight, BarChart3, FileText, Shield, Users } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  const handleSignIn = () => {
    window.location.href = getLoginUrl();
  };

  const lifecycleStages = [
    { name: "Intake & LOI", path: "/projects" },
    { name: "Pre-Qualification", path: "/projects" },
    { name: "MOU (24 months)", path: "/projects" },
    { name: "Compliance Docs", path: "/projects" },
    { name: "Full Compliance", path: "/projects" },
    { name: "Evaluation", path: "/projects" },
    { name: "Board Review", path: "/projects" },
    { name: "Bidding", path: "/projects" },
    { name: "Agreements", path: "/projects" },
    { name: "Monitoring", path: "/projects" },
    { name: "Enforcement", path: "/projects" },
    { name: "Closure", path: "/projects" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-white">ReclaimFlow PH</div>
          <Button onClick={handleSignIn}>Sign In</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          Philippine Land Reclamation Project Lifecycle Management
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Streamline your PPP projects from intake through monitoring with
          comprehensive workflow automation, compliance tracking, and
          stakeholder coordination.
        </p>
        <Button
          size="lg"
          onClick={handleGetStarted}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Get Started <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">
          Key Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <FileText className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Document Management
            </h3>
            <p className="text-slate-400">
              Versioned document storage with compliance checklist verification
            </p>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <Users className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Multi-Role Access
            </h3>
            <p className="text-slate-400">
              8 distinct roles with granular permissions and project-level access control
            </p>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <BarChart3 className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Analytics & Reporting
            </h3>
            <p className="text-slate-400">
              Real-time dashboards with bottleneck analysis and KPI tracking
            </p>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <Shield className="w-8 h-8 text-orange-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Compliance & Audit
            </h3>
            <p className="text-slate-400">
              Complete audit trails with SLA tracking and automated notifications
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Stages */}
      <section className="container mx-auto px-4 py-20 bg-slate-800/50 rounded-lg">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">
          Project Lifecycle Stages
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {lifecycleStages.map((stage) => (
            <button
              key={stage.name}
              onClick={() => {
                if (isAuthenticated) {
                  navigate(stage.path);
                } else {
                  window.location.href = getLoginUrl();
                }
              }}
              className="bg-slate-700 hover:bg-slate-600 p-4 rounded border border-slate-600 text-center text-slate-200 transition-colors cursor-pointer"
            >
              {stage.name}
            </button>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-6">
          Ready to streamline your projects?
        </h2>
        <Button
          size="lg"
          onClick={handleGetStarted}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Sign In Now
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900 py-8">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>ReclaimFlow PH - Philippine Land Reclamation Project Management</p>
          <p className="text-sm mt-2">© 2026. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
