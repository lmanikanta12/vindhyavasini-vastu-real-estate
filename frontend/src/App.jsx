import { Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import { RequireRole, ScrollToTop } from './routes/guards';

import Home from './pages/public/Home';
import Properties from './pages/public/Properties';
import PropertyDetail from './pages/public/PropertyDetail';
import VastuServices from './pages/public/VastuServices';
import BookVastu from './pages/public/BookVastu';
import Contact from './pages/public/Contact';
import NotFound from './pages/public/NotFound';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ProfilePage from './pages/shared/ProfilePage';
import Legal from './pages/public/Legal';
import PageTitle from './routes/PageTitle';
import Construction from './pages/public/Construction';
import CustomerConstruction from './pages/customer/CustomerConstruction';
import AdminConstruction from './pages/admin/AdminConstruction';

import CustomerOverview from './pages/customer/CustomerOverview';
import CustomerShortlist from './pages/customer/CustomerShortlist';
import CustomerEnquiries from './pages/customer/CustomerEnquiries';
import CustomerAppointments from './pages/customer/CustomerAppointments';
import CustomerPayments from './pages/customer/CustomerPayments';

import AgentOverview from './pages/agent/AgentOverview';
import AgentListings from './pages/agent/AgentListings';
import AgentEnquiries from './pages/agent/AgentEnquiries';
import AgentVisits from './pages/agent/AgentVisits';
import AgentCustomers from './pages/agent/AgentCustomers';
import ConsultantSchedule from './pages/consultant/ConsultantSchedule';
import AdminActivity from './pages/admin/AdminActivity';
import AdminReviews from './pages/admin/AdminReviews';

import ConsultantOverview from './pages/consultant/ConsultantOverview';
import ConsultantRequests from './pages/consultant/ConsultantRequests';
import ConsultantServices from './pages/consultant/ConsultantServices';

import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminPayments from './pages/admin/AdminPayments';
import AdminReports from './pages/admin/AdminReports';
import AdminSettings from './pages/admin/AdminSettings';
import ServicesManager from './components/shared/ServicesManager';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <PageTitle />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="properties" element={<Properties />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="vastu" element={<VastuServices />} />
          <Route path="vastu/book" element={<BookVastu />} />
          <Route path="contact" element={<Contact />} />
          <Route path="construction" element={<Construction />} />
          <Route path="terms" element={<Legal doc="terms" />} />
          <Route path="privacy" element={<Legal doc="privacy" />} />
          <Route path="disclaimer" element={<Legal doc="disclaimer" />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />

        <Route path="customer" element={<RequireRole role="customer" />}>
          <Route element={<DashboardLayout role="customer" />}>
            <Route index element={<CustomerOverview />} />
            <Route path="shortlist" element={<CustomerShortlist />} />
            <Route path="enquiries" element={<CustomerEnquiries />} />
            <Route path="appointments" element={<CustomerAppointments />} />
            <Route path="construction" element={<CustomerConstruction />} />
            <Route path="payments" element={<CustomerPayments />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="agent" element={<RequireRole role="agent" />}>
          <Route element={<DashboardLayout role="agent" />}>
            <Route index element={<AgentOverview />} />
            <Route path="listings" element={<AgentListings />} />
            <Route path="enquiries" element={<AgentEnquiries />} />
            <Route path="visits" element={<AgentVisits />} />
            <Route path="schedule" element={<ConsultantSchedule agent />} />
            <Route path="customers" element={<AgentCustomers />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="consultant" element={<RequireRole role="consultant" />}>
          <Route element={<DashboardLayout role="consultant" />}>
            <Route index element={<ConsultantOverview />} />
            <Route path="requests" element={<ConsultantRequests />} />
            <Route path="schedule" element={<ConsultantSchedule />} />
            <Route path="services" element={<ConsultantServices />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="admin" element={<RequireRole role="admin" />}>
          <Route element={<DashboardLayout role="admin" />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="properties" element={<AgentListings all />} />
            <Route path="enquiries" element={<AgentEnquiries all />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="staff" element={<AdminUsers staffOnly />} />
            <Route path="services" element={<ServicesManager />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="construction" element={<AdminConstruction />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="activity" element={<AdminActivity />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
