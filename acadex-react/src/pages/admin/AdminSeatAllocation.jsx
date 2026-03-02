import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { examService, roomService, seatAllocationService } from '../../services';

const STRATEGIES = [
  { key: 'ml_optimized', label: 'ML Optimized', desc: 'Checkerboard + simulated annealing — maximises department separation' },
  { key: 'random', label: 'Random', desc: 'Randomly shuffled placement across seats' },
  { key: 'sequential', label: 'Sequential', desc: 'Simple row-by-row sequential fill' },
];

const DEPT_COLORS = [
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-yellow-200 text-yellow-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
  'bg-orange-200 text-orange-800',
  'bg-teal-200 text-teal-800',
  'bg-red-200 text-red-800',
  'bg-indigo-200 text-indigo-800',
  'bg-cyan-200 text-cyan-800',
];

export default function AdminSeatAllocation() {
  const [exams, setExams] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [strategy, setStrategy] = useState('ml_optimized');
  const [customMembers, setCustomMembers] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      examService.list({}).catch(() => []),
      roomService.list({ isActive: true }).catch(() => []),
    ]).then(([e, r]) => {
      setExams(Array.isArray(e) ? e : []);
      setRooms(Array.isArray(r) ? r : []);
    });
  }, []);

  const toggleRoom = (id) => {
    setSelectedRoomIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleAllocate = async () => {
    if (!selectedExam || selectedRoomIds.length === 0) {
      setError('Please select an exam and at least one room.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        examId: Number(selectedExam),
        roomIds: selectedRoomIds,
        strategy,
        customMembersPerBench: customMembers ? Number(customMembers) : null,
      };
      const res = await seatAllocationService.allocate(payload);
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Allocation failed');
    } finally {
      setLoading(false);
    }
  };

  // Build dept → color map from result
  const deptColorMap = {};
  if (result?.departmentDistribution) {
    Object.keys(result.departmentDistribution).forEach((dept, i) => {
      deptColorMap[dept] = DEPT_COLORS[i % DEPT_COLORS.length];
    });
  }

  return (
    <DashboardLayout role="admin">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ML Seat Allocation</h1>

      {/* Configuration Panel */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Exam */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
            <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-rose-300">
              <option value="">Choose exam...</option>
              {exams.map((e) => <option key={e.id} value={e.id}>{e.title} — {e.scheduledDate}</option>)}
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allocation Strategy</label>
            <div className="space-y-2">
              {STRATEGIES.map((s) => (
                <label key={s.key} className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${strategy === s.key ? 'bg-rose-50 border-rose-300' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="strategy" value={s.key} checked={strategy === s.key} onChange={() => setStrategy(s.key)} className="mt-1" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Rooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Rooms</label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {rooms.map((r) => (
                <label key={r.id} className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${selectedRoomIds.includes(r.id) ? 'bg-rose-50 border-rose-300' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selectedRoomIds.includes(r.id)} onChange={() => toggleRoom(r.id)} />
                  <div className="text-sm">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-gray-500 ml-2">({r.rows}x{r.columns}, cap {r.capacity})</span>
                  </div>
                </label>
              ))}
              {rooms.length === 0 && <p className="text-sm text-gray-400">No rooms available. Create rooms first.</p>}
            </div>
          </div>

          {/* Custom members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Members per Bench (optional override)</label>
            <input type="number" min="1" max="4" value={customMembers} onChange={(e) => setCustomMembers(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-rose-300" placeholder="Default from room config" />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        <button onClick={handleAllocate} disabled={loading} className="mt-6 px-8 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 text-sm font-medium transition-colors">
          {loading ? (
            <span className="flex items-center space-x-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
              <span>Running ML Algorithm...</span>
            </span>
          ) : 'Allocate Seats'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Students" value={result.totalStudents} color="bg-rose-500" />
            <StatCard label="Seats Assigned" value={result.totalSeatsUsed} color="bg-green-500" />
            <StatCard label="Total Capacity" value={result.totalCapacity} color="bg-purple-500" />
            <StatCard label="Separation Score" value={result.overallSeparationScore} color="bg-orange-500" subtitle="Higher = Better" />
          </div>

          {/* Department Distribution */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Department Distribution</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.departmentDistribution || {}).map(([dept, count]) => (
                <span key={dept} className={`px-3 py-1.5 rounded-full text-xs font-medium ${deptColorMap[dept] || 'bg-gray-200 text-gray-800'}`}>
                  {dept}: {count}
                </span>
              ))}
            </div>
          </div>

          {/* Room Grids */}
          {result.roomSummaries?.map((room) => (
            <div key={room.roomId} className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">{room.roomName} — Grid Layout</h2>
                <span className="text-sm text-gray-500">{room.assigned}/{room.capacity} seats used</span>
              </div>

              {/* Board indicator */}
              <div className="mb-2 text-center">
                <div className="inline-block bg-gray-800 text-white text-xs px-8 py-1 rounded">BOARD</div>
              </div>

              {/* Grid */}
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  {room.grid?.map((row, ri) => (
                    <div key={ri} className="flex gap-1 mb-1">
                      <div className="w-8 flex items-center justify-center text-xs text-gray-400 font-mono">R{ri + 1}</div>
                      {row.map((cell, ci) => {
                        const dept = cell === '\u2014' ? null : cell;
                        const deptFull = dept ? Object.keys(result.departmentDistribution || {}).find(d =>
                          d.substring(0, 3).toUpperCase() === dept
                        ) : null;
                        const colorClass = deptFull ? (deptColorMap[deptFull] || 'bg-gray-100 text-gray-600') : 'bg-gray-50 text-gray-300';

                        return (
                          <div key={ci} className={`w-12 h-10 flex items-center justify-center text-xs font-medium rounded ${colorClass} border`} title={deptFull || 'Empty'}>
                            {cell}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.keys(result.departmentDistribution || {}).map((dept) => (
                  <span key={dept} className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${deptColorMap[dept]}`}>
                    {dept.substring(0, 3).toUpperCase()} = {dept}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Full Assignment Table */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">All Seat Assignments ({result.assignments?.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium">#</th>
                    <th className="text-left py-2 px-3 font-medium">Student</th>
                    <th className="text-left py-2 px-3 font-medium">Roll / Email</th>
                    <th className="text-left py-2 px-3 font-medium">Department</th>
                    <th className="text-left py-2 px-3 font-medium">Hall</th>
                    <th className="text-left py-2 px-3 font-medium">Seat</th>
                  </tr>
                </thead>
                <tbody>
                  {result.assignments?.map((a, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                      <td className="py-2 px-3 font-medium">{a.studentName}</td>
                      <td className="py-2 px-3 text-gray-600">{a.rollNumber}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${deptColorMap[a.department] || 'bg-gray-200'}`}>{a.department}</span>
                      </td>
                      <td className="py-2 px-3">{a.hallName}</td>
                      <td className="py-2 px-3 font-mono text-sm">{a.seatNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

function StatCard({ label, value, color, subtitle }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <span className="text-white text-lg font-bold">{typeof value === 'number' && value > 99 ? '\u2605' : value}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {subtitle && <p className="text-xs text-green-600">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
