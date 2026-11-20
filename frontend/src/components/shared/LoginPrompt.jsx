import { Link, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export default function LoginPrompt({ message = 'Please log in with a customer account to continue.', staff = false }) {
  const loc = useLocation();
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><LogIn size={26} /></span>
      <p className="max-w-sm text-sm text-muted">{staff ? 'This action is available to customer accounts only. Staff can manage requests from their dashboards.' : message}</p>
      {!staff && (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/login" state={{ from: loc.pathname + loc.search }} className="btn btn-primary btn-sm">Log in</Link>
          <Link to="/register" state={{ from: loc.pathname + loc.search }} className="btn btn-outline btn-sm">Create account</Link>
        </div>
      )}
    </div>
  );
}
