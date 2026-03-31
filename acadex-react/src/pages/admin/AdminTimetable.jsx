import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { timetableService, courseService, adminUserService, roomService } from '../../services';
import { format, parseISO } from 'date-fns';

const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const timeSlots = Array.from({ length: 10 }, (_, i) => `${i + 8}:00 - ${i + 9}:00`);

export default function AdminTimetable() {
    const [timetable, setTimetable] = useState([]);
    const [courses, setCourses] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [form, setForm] = useState({
        courseId: '',
        facultyId: '',
        roomId: '',
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '09:00',
    });

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            timetableService.list(),
            courseService.list(),
            adminUserService.list({ role: 'faculty' }),
            roomService.list(),
        ]).then(([timetableData, courseData, facultyData, roomData]) => {
            setTimetable(Array.isArray(timetableData) ? timetableData : []);
            setCourses(Array.isArray(courseData) ? courseData : []);
            setFaculties(Array.isArray(facultyData) ? facultyData : []);
            setRooms(Array.isArray(roomData) ? roomData : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => setForm({ courseId: '', facultyId: '', roomId: '', dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '09:00' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const handleCreate = async () => {
        try {
            const payload = {
                ...form,
                course: { id: form.courseId },
                faculty: { id: form.facultyId },
                room: { id: form.roomId },
            };
            await timetableService.create(payload);
            setShowCreate(false);
            resetForm();
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create timetable entry');
        }
    };

    const handleUpdate = async () => {
        try {
            const payload = {
                ...form,
                course: { id: form.courseId },
                faculty: { id: form.facultyId },
                room: { id: form.roomId },
            };
            await timetableService.update(editEntry.id, payload);
            setEditEntry(null);
            resetForm();
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update timetable entry');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this timetable entry?')) return;
        await timetableService.remove(id);
        fetchData();
    };

    const openEdit = (entry) => {
        setForm({
            courseId: entry.course.id,
            facultyId: entry.faculty.id,
            roomId: entry.room.id,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
        });
        setEditEntry(entry);
    };

    const TimetableForm = ({ onSubmit, submitLabel }) => (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select name="courseId" value={form.courseId} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none">
                        <option value="">Select Course</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.courseName || c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                    <select name="facultyId" value={form.facultyId} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none">
                        <option value="">Select Faculty</option>
                        {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                    <select name="roomId" value={form.roomId} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none">
                        <option value="">Select Room</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                    <select name="dayOfWeek" value={form.dayOfWeek} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none">
                        {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" />
                </div>
            </div>
            <div className="flex justify-end mt-4">
                <button onClick={() => { setShowCreate(false); setEditEntry(null); resetForm(); }} className="px-4 py-2 text-gray-600">Cancel</button>
                <button onClick={onSubmit} className="px-4 py-2 bg-rose-600 text-white rounded-lg">{submitLabel}</button>
            </div>
        </div>
    );

    const renderTimetable = () => {
        const grid = {};
        timetable.forEach(entry => {
            const day = entry.dayOfWeek;
            const startHour = parseInt(entry.startTime.split(':')[0]);
            const timeSlot = `${startHour}:00 - ${startHour + 1}:00`;
            if (!grid[timeSlot]) {
                grid[timeSlot] = {};
            }
            grid[timeSlot][day] = entry;
        });

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-4 py-2 border-b">Time</th>
                            {daysOfWeek.map(day => <th key={day} className="px-4 py-2 border-b">{day}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map(slot => (
                            <tr key={slot}>
                                <td className="px-4 py-2 border-b">{slot}</td>
                                {daysOfWeek.map(day => {
                                    const entry = grid[slot] && grid[slot][day];
                                    return (
                                        <td key={day} className="px-4 py-2 border-b text-center">
                                            {entry ? (
                                                <div className="p-2 rounded-lg bg-rose-100 text-rose-800">
                                                    <p className="font-bold">{entry.course?.courseName || entry.course?.name}</p>
                                                    <p className="text-sm">{entry.faculty.name}</p>
                                                    <p className="text-xs">{entry.room.name}</p>
                                                    <div className="mt-2">
                                                        <button onClick={() => openEdit(entry)} className="text-xs text-blue-600">Edit</button>
                                                        <button onClick={() => handleDelete(entry.id)} className="ml-2 text-xs text-red-600">Delete</button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <DashboardLayout role="admin">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Timetable Management</h1>
                <button onClick={() => { setShowCreate(true); setEditEntry(null); resetForm(); }} className="px-4 py-2 bg-rose-600 text-white rounded-lg">
                    + Add Schedule
                </button>
            </div>

            {showCreate && <TimetableForm onSubmit={handleCreate} submitLabel="Create" />}
            {editEntry && <TimetableForm onSubmit={handleUpdate} submitLabel="Update" />}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
                </div>
            ) : (
                renderTimetable()
            )}
        </DashboardLayout>
    );
}
