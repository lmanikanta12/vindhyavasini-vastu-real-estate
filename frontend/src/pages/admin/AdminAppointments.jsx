import { useState } from 'react';
import AgentVisits from '../agent/AgentVisits';
import ConsultantRequests from '../consultant/ConsultantRequests';
import Tabs from '../../components/ui/Tabs';

export default function AdminAppointments() {
  const [tab, setTab] = useState('consults');
  return (
    <>
      <Tabs className="mb-6" value={tab} onChange={setTab} items={[{ key: 'consults', label: 'Vastu consultations' }, { key: 'visits', label: 'Site visits' }]} />
      {tab === 'consults' ? <ConsultantRequests all /> : <AgentVisits all />}
    </>
  );
}
