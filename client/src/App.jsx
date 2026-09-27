import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { Spinner } from './components/ui.jsx';

import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import TripDetail from './pages/TripDetail.jsx';
import Booking from './pages/Booking.jsx';
import Confirmation from './pages/Confirmation.jsx';
import MyTrips from './pages/MyTrips.jsx';
import Login from './pages/Login.jsx';
import Guides from './pages/Guides.jsx';
import GuideDetail from './pages/GuideDetail.jsx';
import Packages from './pages/Packages.jsx';
import Rentals from './pages/Rentals.jsx';
import RentalDetail from './pages/RentalDetail.jsx';
import PackageDetail from './pages/PackageDetail.jsx';
import Destinations from './pages/Destinations.jsx';
import Destination from './pages/Destination.jsx';
import Profile from './pages/Profile.jsx';
import Contact from './pages/Contact.jsx';
import About from './pages/About.jsx';
import Tracker from './pages/Tracker.jsx';
import NotFound from './pages/NotFound.jsx';

// Socket.io, the QR scanner and the admin console are big and rarely the
// first thing a visitor opens, so they load on demand.
const Track = lazy(() => import('./pages/Track.jsx'));
const GuidePortal = lazy(() => import('./pages/GuidePortal.jsx'));
const DriverPortal = lazy(() => import('./pages/DriverPortal.jsx'));
const Hq = lazy(() => import('./pages/Hq.jsx'));

/** Gate a route behind sign-in, and optionally behind a role. */
function Protected({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="trips/:id" element={<TripDetail />} />
        <Route path="book" element={<Protected><Booking /></Protected>} />
        <Route path="confirmation/:reference" element={<Protected><Confirmation /></Protected>} />
        <Route path="my-trips" element={<Protected><MyTrips /></Protected>} />
        <Route path="login" element={<Login />} />
        <Route path="guides" element={<Guides />} />
        <Route path="guides/:id" element={<GuideDetail />} />
        <Route path="packages" element={<Packages />} />
        {/* Cars, bikes and rooms share one screen; the path carries the kind. */}
        <Route path="cars" element={<Rentals key="car" kind="car" />} />
        <Route path="bikes" element={<Rentals key="bike" kind="bike" />} />
        <Route path="stays" element={<Rentals key="room" kind="room" />} />
        <Route path="hire/:id" element={<RentalDetail />} />
        <Route path="packages/:slug" element={<PackageDetail />} />
        <Route path="track/:tripId" element={<Track />} />
        <Route path="tracker" element={<Tracker />} />
        <Route path="profile" element={<Profile />} />
        <Route path="contact" element={<Contact />} />
        <Route path="about" element={<About />} />
        <Route path="destinations" element={<Destinations />} />
        <Route path="destinations/:slug" element={<Destination />} />
        <Route path="guide-portal" element={<Protected roles={['guide']}><GuidePortal /></Protected>} />
        <Route path="driver-portal" element={<Protected roles={['driver', 'admin']}><DriverPortal /></Protected>} />
        <Route path="hq" element={<Protected roles={['admin']}><Hq /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
