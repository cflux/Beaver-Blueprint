import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProjectDetail } from './pages/ProjectDetail';
import { PlanEditor } from './pages/PlanEditor';
import { IssueBoard } from './pages/IssueBoard';
import { IssueDetail } from './pages/IssueDetail';
import { DocsView } from './pages/DocsView';
import { DocEditor } from './pages/DocEditor';
import { ProgressView } from './pages/ProgressView';
import { DiscoveryView } from './pages/DiscoveryView';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          <Route path="/projects/:slug/discovery" element={<DiscoveryView />} />
          <Route path="/projects/:slug/plan" element={<PlanEditor />} />
          <Route path="/projects/:slug/issues" element={<IssueBoard />} />
          <Route path="/projects/:slug/issues/:id" element={<IssueDetail />} />
          <Route path="/projects/:slug/docs" element={<DocsView />} />
          <Route path="/projects/:slug/docs/:docSlug" element={<DocEditor />} />
          <Route path="/projects/:slug/progress" element={<ProgressView />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
