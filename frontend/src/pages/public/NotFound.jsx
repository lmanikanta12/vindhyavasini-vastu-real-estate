import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-8xl font-semibold text-brand">404</p>
      <h1 className="mt-4 text-3xl font-semibold">This page has moved out</h1>
      <p className="mt-2 max-w-md text-muted">The page you are looking for does not exist or has been moved.</p>
      <div className="mt-7 flex gap-3">
        <Link to="/" className="btn btn-primary">Back to home</Link>
        <Link to="/properties" className="btn btn-outline">Browse properties</Link>
      </div>
    </div>
  );
}
