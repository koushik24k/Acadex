import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { roomService } from '../../services';

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [form, setForm] = useState({
    name: '', building: '', floor: '', rows: 5, columns: 5,
    membersPerBench: 1, roomType: 'classroom', boardPosition: 'top',
  });

  const fetchRooms = () => {
    setLoading(true);
    roomService.list({ isActive: true }).then((data) => {
      setRooms(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchRooms(); }, []);

  const resetForm = () => setForm({ name: '', building: '', floor: '', rows: 5, columns: 5, membersPerBench: 1, roomType: 'classroom', boardPosition: 'top' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleCreate = async () => {
    try {
      await roomService.create({
        ...form,
        rows: parseInt(form.rows), columns: parseInt(form.columns),
        membersPerBench: parseInt(form.membersPerBench),
      });
      setShowCreate(false);
      resetForm();
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create room');
    }
  };

  const handleUpdate = async () => {
    try {
      await roomService.update(editRoom.id, {
        ...form,
        rows: parseInt(form.rows), columns: parseInt(form.columns),
        membersPerBench: parseInt(form.membersPerBench),
      });
      setEditRoom(null);
      resetForm();
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update room');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this room?')) return;
    await roomService.remove(id);
    fetchRooms();
  };

  const openEdit = (room) => {
    setForm({
      name: room.name, building: room.building || '', floor: room.floor || '',
      rows: room.rows, columns: room.columns, membersPerBench: room.membersPerBench,
      roomType: room.roomType || 'classroom', boardPosition: room.boardPosition || 'top',
    });
    setEditRoom(room);
  };

  const filtered = rooms.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()));

  const RoomForm = ({ onSubmit, submitLabel }) => (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input name="name" value={form.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
          <select name="roomType" value={form.roomType} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none">
            <option value="classroom">Classroom</option>
            <option value="lab">Lab</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
          <input name="building" value={form.building} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
          <input name="floor" value={form.floor} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
          <input type="number" name="rows" value={form.rows} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Columns</label>
          <input type="number" name="columns" value={form.columns} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Members per Bench</label>
          <input type="number" name="membersPerBench" value={form.membersPerBench} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Board Position</label>
          <select name="boardPosition" value={form.boardPosition} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none">
            <option value="top">Top</option><option value="bottom">Bottom</option>
            <option value="left">Left</option><option value="right">Right</option>
          </select>
        </div>
      </div>
      <div className="flex space-x-3 mt-4">
        <button onClick={onSubmit} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">{submitLabel}</button>
        <button onClick={() => { setShowCreate(false); setEditRoom(null); resetForm(); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">Cancel</button>
      </div>
    </div>
  );

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
        <button onClick={() => { setShowCreate(true); setEditRoom(null); resetForm(); }} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">
          Add Room
        </button>
      </div>

      {showCreate && <RoomForm onSubmit={handleCreate} submitLabel="Create Room" />}
      {editRoom && <RoomForm onSubmit={handleUpdate} submitLabel="Update Room" />}

      <input type="text" placeholder="Search rooms..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full mb-6 px-4 py-2 border rounded-lg outline-none" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div></div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-500">No rooms found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((room) => (
            <div key={room.id} className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 text-lg mb-1">{room.name}</h3>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${room.roomType === 'lab' ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'}`}>
                {room.roomType}
              </span>
              <p className="text-sm text-gray-500">Building: {room.building || '-'} | Floor: {room.floor || '-'}</p>
              <p className="text-sm text-gray-500">Layout: {room.rows}×{room.columns} | {room.membersPerBench}/bench</p>
              <p className="text-sm text-gray-500 mb-4">Capacity: {room.capacity}</p>
              <div className="flex space-x-2">
                <button onClick={() => openEdit(room)} className="flex-1 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-sm hover:bg-rose-100">Edit</button>
                <button onClick={() => handleDelete(room.id)} className="flex-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
