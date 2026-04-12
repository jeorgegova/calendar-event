import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Home from "./pages/Home";
import EventsPage from "./pages/EventsPage";
import CommitteesPage from "./pages/CommitteesPage";
import NoticesPage from "./pages/NoticesPage";
import ParametersPage from "./pages/ParametersPage";
import UsersPage from "./pages/UsersPage";
import AuditPage from "./pages/AuditPage";
import ProfilePage from "./pages/ProfilePage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import UpdatePasswordPage from "./pages/auth/UpdatePasswordPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/eventos" element={<EventsPage />} />
          <Route path="/comites" element={<CommitteesPage />} />
          <Route path="/avisos" element={<NoticesPage />} />
          <Route path="/parametros" element={<ParametersPage />} />
          <Route path="/usuarios" element={<UsersPage />} />
          <Route path="/auditoria" element={<AuditPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="*" element={<div className="p-8">404 No Encontrado</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
