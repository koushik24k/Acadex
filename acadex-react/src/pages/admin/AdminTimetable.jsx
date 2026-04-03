import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { timetableService, courseService, adminUserService, roomService } from '../../services';

const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const slotTemplate = [
    { start: '08:15', end: '09:05', label: '08:15 - 09:05' },
    { start: '09:05', end: '09:55', label: '09:05 - 09:55' },
    { start: '10:10', end: '11:00', label: '10:10 - 11:00' },
    { start: '11:00', end: '11:50', label: '11:00 - 11:50' },
    { start: '11:50', end: '12:45', label: '11:50 - 12:45' },
    { start: '12:45', end: '13:30', label: '12:45 - 13:30' },
    { start: '13:30', end: '14:20', label: '13:30 - 14:20' },
    { start: '14:20', end: '15:10', label: '14:20 - 15:10' },
    { start: '15:10', end: '16:00', label: '15:10 - 16:00' },
];

const sheetColumns = [
    { kind: 'slot', start: '08:15', end: '09:05', label: '8:15AM - 9:05AM' },
    { kind: 'slot', start: '09:05', end: '09:55', label: '9:05AM - 9:55AM' },
    { kind: 'break', label: '9:55AM - 10:10AM', title: 'BREAK' },
    { kind: 'slot', start: '10:10', end: '11:00', label: '10:10AM - 11:00AM' },
    { kind: 'slot', start: '11:00', end: '11:50', label: '11:00AM - 11:50AM' },
    { kind: 'slot', start: '11:50', end: '12:45', label: '11:50AM - 12:45PM' },
    { kind: 'slot', start: '12:45', end: '13:30', label: '12:45PM - 1:30PM' },
    { kind: 'slot', start: '13:30', end: '14:20', label: '1:30PM - 2:20PM' },
    { kind: 'slot', start: '14:20', end: '15:10', label: '2:20PM - 3:10PM' },
    { kind: 'slot', start: '15:10', end: '16:00', label: '3:10PM - 4:00PM' },
];

const cellPalettes = [
    'bg-red-100 text-red-900 border-red-300',
    'bg-emerald-100 text-emerald-900 border-emerald-300',
    'bg-blue-100 text-blue-900 border-blue-300',
    'bg-amber-100 text-amber-900 border-amber-300',
    'bg-violet-100 text-violet-900 border-violet-300',
    'bg-cyan-100 text-cyan-900 border-cyan-300',
];

export default function AdminTimetable() {
    const [timetable, setTimetable] = useState([]);
    const [courses, setCourses] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [predicting, setPredicting] = useState(false);
    const [predictionNote, setPredictionNote] = useState('');
    const [autoGenerating, setAutoGenerating] = useState(false);
    const [autoSemester, setAutoSemester] = useState('');
    const [autoDepartment, setAutoDepartment] = useState('');
    const [overwriteExisting, setOverwriteExisting] = useState(false);
    const [autoResult, setAutoResult] = useState('');
    const [lockedSlot, setLockedSlot] = useState(null);
    const [form, setForm] = useState({
        courseId: '',
        facultyId: '',
        roomId: '',
        dayOfWeek: 'MONDAY',
        startTime: slotTemplate[0].start,
        endTime: slotTemplate[0].end,
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
            const semesters = [...new Set((Array.isArray(courseData) ? courseData : []).map(c => String(c.semester || '')).filter(Boolean))];
            if (!autoSemester && semesters.length > 0) {
                setAutoSemester(semesters[0]);
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setForm({
            courseId: '',
            facultyId: '',
            roomId: '',
            dayOfWeek: 'MONDAY',
            startTime: slotTemplate[0].start,
            endTime: slotTemplate[0].end,
        });
        setPredictionNote('');
        setLockedSlot(null);
    };

    const openQuickAdd = (day, startTime, endTime) => {
        setEditEntry(null);
        setLockedSlot({ dayOfWeek: day, startTime, endTime });
        setForm({
            courseId: '',
            facultyId: '',
            roomId: '',
            dayOfWeek: day,
            startTime,
            endTime,
        });
        setShowCreate(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const handlePredictSlot = async () => {
        if (!form.courseId || !form.facultyId) {
            alert('Please select course and faculty before predicting slot.');
            return;
        }

        const selectedCourse = courses.find((c) => String(c.id) === String(form.courseId));
        const difficulty = selectedCourse?.credits >= 4 ? 'High' : selectedCourse?.credits === 3 ? 'Medium' : 'Low';
        const sessionType = (selectedCourse?.type || 'Theory').toLowerCase() === 'lab' ? 'Lab' : 'Theory';

        setPredicting(true);
        setPredictionNote('');
        try {
            const payload = {
                items: [
                    {
                        courseId: Number(form.courseId),
                        subject: selectedCourse?.courseName || selectedCourse?.name || 'General Subject',
                        facultyId: String(form.facultyId),
                        semester: String(selectedCourse?.semester || '1'),
                        difficulty,
                        sessionType,
                    },
                ],
            };

            const data = await timetableService.predictSlots(payload);
            const predicted = Array.isArray(data?.predictions) ? data.predictions[0] : null;
            if (!predicted) {
                setPredictionNote('No prediction returned from service.');
                return;
            }

            setForm((prev) => ({
                ...prev,
                dayOfWeek: predicted.day || prev.dayOfWeek,
                startTime: predicted.startTime || prev.startTime,
                endTime: predicted.endTime || prev.endTime,
            }));

            setPredictionNote(
                `Predicted ${predicted.day} ${predicted.startTime} (${predicted.conflictAdjusted ? 'adjusted for clash' : 'no clash'})`
            );
        } catch (err) {
            setPredictionNote(err.response?.data?.error || 'Prediction failed.');
        } finally {
            setPredicting(false);
        }
    };

    const handleAutoGenerateSemester = async () => {
        if (!autoSemester) {
            alert('Please select a semester first.');
            return;
        }

        setAutoGenerating(true);
        setAutoResult('');
        try {
            const data = await timetableService.autoGenerateSemester({
                semester: autoSemester,
                department: autoDepartment || null,
                overwriteExisting,
            });

            const created = data?.created ?? 0;
            const skipped = data?.skipped ?? 0;
            setAutoResult(`Generated full-week timetable for semester ${autoSemester}: ${created} created, ${skipped} skipped.`);
            fetchData();
        } catch (err) {
            setAutoResult(err.response?.data?.error || 'Automatic timetable generation failed.');
        } finally {
            setAutoGenerating(false);
        }
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
        setLockedSlot(null);
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
            {lockedSlot && (
                <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                    Quick Add Mode: {lockedSlot.dayOfWeek} {lockedSlot.startTime} - {lockedSlot.endTime}
                </div>
            )}
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
                    <select name="dayOfWeek" value={form.dayOfWeek} onChange={handleChange} disabled={!!lockedSlot} className="w-full px-3 py-2 border rounded-lg outline-none disabled:bg-slate-100 disabled:text-slate-500">
                        {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="col-span-2 flex items-end justify-end">
                    <button
                        type="button"
                        onClick={handlePredictSlot}
                        disabled={predicting || !!lockedSlot}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {predicting ? 'Predicting...' : (lockedSlot ? 'Slot Locked (Quick Add)' : 'Auto Predict Slot (ML)')}
                    </button>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input type="time" name="startTime" value={form.startTime} onChange={handleChange} disabled={!!lockedSlot} className="w-full px-3 py-2 border rounded-lg outline-none disabled:bg-slate-100 disabled:text-slate-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input type="time" name="endTime" value={form.endTime} onChange={handleChange} disabled={!!lockedSlot} className="w-full px-3 py-2 border rounded-lg outline-none disabled:bg-slate-100 disabled:text-slate-500" />
                </div>
            </div>
            {predictionNote && (
                <p className="mt-3 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">{predictionNote}</p>
            )}
            <div className="flex justify-end mt-4">
                <button onClick={() => { setShowCreate(false); setEditEntry(null); resetForm(); }} className="px-4 py-2 text-gray-600">Cancel</button>
                <button onClick={onSubmit} className="px-4 py-2 bg-rose-600 text-white rounded-lg">{submitLabel}</button>
            </div>
        </div>
    );

    const formatTime = (t) => {
        if (!t) return '';
        return String(t).slice(0, 5);
    };

    const colorForEntry = (entry) => {
        const key = `${entry?.course?.courseCode || ''}|${entry?.course?.courseName || ''}`;
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
        }
        return cellPalettes[hash % cellPalettes.length];
    };

    const shortFaculty = (name) => {
        if (!name) return '';
        return name
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0]?.toUpperCase())
            .join('');
    };

    const renderTimetable = () => {
        const grid = {};

        timetable.forEach(entry => {
            const day = entry.dayOfWeek;
            const start = formatTime(entry.startTime);
            const end = formatTime(entry.endTime);
            if (!day || !start || !end) return;
            grid[`${day}|${start}|${end}`] = entry;
        });

        return (
            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white">
                <table className="min-w-[1300px] w-full border-collapse text-[11px]">
                    <thead>
                        <tr className="bg-yellow-100 border-b-2 border-slate-800">
                            <th className="border border-slate-400 px-2 py-1 font-bold">Time / Day</th>
                            {sheetColumns.map((col) => (
                                <th key={col.label} className={`border border-slate-400 px-2 py-1 font-bold ${col.kind === 'break' ? 'bg-slate-200' : ''}`}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {daysOfWeek.map((day) => (
                            <tr key={day} className="border-b border-slate-300">
                                <td className="border border-slate-400 px-2 py-1 font-semibold bg-slate-50">{day.slice(0, 3)}</td>
                                {sheetColumns.map((col) => {
                                    if (col.kind === 'break') {
                                        return (
                                            <td key={`${day}-${col.label}`} className="border border-slate-300 bg-slate-100 text-center text-[10px] text-slate-500">
                                                {col.title || ''}
                                            </td>
                                        );
                                    }

                                    const entry = grid[`${day}|${col.start}|${col.end}`];
                                    return (
                                        <td key={`${day}-${col.start}`} className="border border-slate-300 align-top p-1 min-h-[64px] h-[64px]">
                                            {entry ? (
                                                <div className={`h-full rounded px-1 py-1 border ${colorForEntry(entry)}`}>
                                                    <p className="font-bold leading-tight truncate">{entry.course?.courseCode || entry.course?.courseName || entry.course?.name}</p>
                                                    <p className="text-[10px] leading-tight truncate">{shortFaculty(entry.faculty?.name) || entry.faculty?.name}</p>
                                                    <p className="text-[10px] leading-tight truncate">{entry.room?.name}</p>
                                                    <div className="mt-1 leading-none">
                                                        <button onClick={() => openEdit(entry)} className="text-[10px] text-blue-700">Edit</button>
                                                        <button onClick={() => handleDelete(entry.id)} className="ml-2 text-[10px] text-red-700">Delete</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => openQuickAdd(day, col.start, col.end)}
                                                    className="w-full h-full rounded border border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                                    title={`Add schedule for ${day} ${col.start}-${col.end}`}
                                                >
                                                    +
                                                </button>
                                            )}
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

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                        <select
                            value={autoSemester}
                            onChange={(e) => setAutoSemester(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg outline-none"
                        >
                            <option value="">Select semester</option>
                            {[...new Set(courses.map(c => String(c.semester || '')).filter(Boolean))].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department (optional)</label>
                        <input
                            value={autoDepartment}
                            onChange={(e) => setAutoDepartment(e.target.value)}
                            placeholder="e.g. Computer Science"
                            className="w-full px-3 py-2 border rounded-lg outline-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-7">
                            <input
                                type="checkbox"
                                checked={overwriteExisting}
                                onChange={(e) => setOverwriteExisting(e.target.checked)}
                            />
                            Overwrite existing schedules for this semester
                        </label>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleAutoGenerateSemester}
                            disabled={autoGenerating}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {autoGenerating ? 'Generating...' : 'Auto Generate Full Week (ML)'}
                        </button>
                    </div>
                </div>
                {autoResult && (
                    <p className="mt-3 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">{autoResult}</p>
                )}
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
