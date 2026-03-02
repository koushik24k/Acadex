import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, registrationService } from '../../services';

export default function FacultySeating() {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      examService.get(id),
      registrationService.list(id, {}),
    ]).then(([e, regs]) => {
      setExam(e);
      setRegistrations(Array.isArray(regs) ? regs : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await registrationService.generateSeating(id);
      const regs = await registrationService.list(id, {});
      setRegistrations(Array.isArray(regs) ? regs : []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setGenerating(false);
    }
  };

  const approved = registrations.filter((r) => r.registrationStatus === 'approved');
  const withSeats = registrations.filter((r) => r.seatNumber);
  const pending = approved.filter((r) => !r.seatNumber);

  if (loading) return <DashboardLayout role="faculty"><div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div></DashboardLayout>;

  return (
    <DashboardLayout role="faculty">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Seating Arrangement</h1>
      <p className="text-gray-500 mb-6">{exam?.title}</p>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-2xl font-bold">{registrations.length}</p><p className="text-sm text-gray-500">Total Registrations</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{approved.length}</p><p className="text-sm text-gray-500">Approved</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-2xl font-bold text-teal-600">{withSeats.length}</p><p className="text-sm text-gray-500">Seats Assigned</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{pending.length}</p><p className="text-sm text-gray-500">Pending Seats</p>
        </div>
      </div>

      {pending.length > 0 && (
        <button onClick={handleGenerate} disabled={generating} className="mb-6 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
          {generating ? 'Generating...' : 'Generate Seat Numbers'}
        </button>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold mb-4">Seating List</h3>
        {withSeats.length === 0 ? <p className="text-gray-500">No seats assigned yet.</p> : (
          <div className="space-y-2">
            {withSeats.map((r) => (
              <div key={r.id} className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Student: {r.studentId?.slice(0, 12)}</span>
                <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">{r.seatNumber}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
