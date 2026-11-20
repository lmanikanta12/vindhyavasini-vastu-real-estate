import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

export default function useShortlist() {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const loc = useLocation();

  return {
    isShortlisted: (propertyId) => data.isShortlisted(user?.id, propertyId),
    toggle(property) {
      if (!user) {
        toast('Please log in to shortlist properties.', 'info');
        navigate('/login', { state: { from: loc.pathname + loc.search } });
        return;
      }
      if (user.role !== 'customer') {
        toast('Shortlisting is available for customer accounts.', 'info');
        return;
      }
      const was = data.isShortlisted(user.id, property.id);
      data.toggleShortlist(user.id, property.id);
      toast(was ? 'Removed from your shortlist.' : 'Added to your shortlist.');
    },
  };
}
