import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminUserService } from '../../services';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', department: '', section: '' });
  const [bulkForm, setBulkForm] = useState({ startRollNumber: '', endRollNumber: '', emailPattern: '{rollno}@student.edu', namePattern: 'Student {rollno}', department: '', section: '', defaultPassword: 'password123' });
  const [bulkResult, setBulkResult] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    const params = {};
    if (roleFilter) params.role = roleFilter;
    adminUserService.list(params).then((data) => {
      setUsers(data?.users || (Array.isArray(data) ? data : []));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleCreate = async () => {
    try {
      await adminUserService.create(form);
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'student', department: '', section: '' });
      fetchUsers();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleUpdate = async () => {
    try {
      await adminUserService.update(editUser.id, form);
      setEditUser(null);
      fetchUsers();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await adminUserService.remove(id);
    fetchUsers();
  };

  const handleBulkCreate = async () => {
    try {
      // Extract the numeric range from roll numbers (e.g., CS001 -> 1, CS050 -> 50)
      const startMatch = bulkForm.startRollNumber.match(/(\d+)/);
      const endMatch = bulkForm.endRollNumber.match(/(\d+)/);
      
      if (!startMatch || !endMatch) {
        alert('Invalid roll number format. Use format like CS001 to CS050');
        return;
      }

      const startNum = parseInt(startMatch[1]);
      const endNum = parseInt(endMatch[1]);
      const prefix = bulkForm.startRollNumber.replace(/\d+/, ''); // Extract non-numeric prefix

      const users = [];
      for (let i = startNum; i <= endNum; i++) {
        const rollNum = prefix + String(i).padStart(String(startNum).length, '0');
        users.push({
          name: bulkForm.namePattern.replace('{rollno}', rollNum),
          email: bulkForm.emailPattern.replace('{rollno}', rollNum),
          password: bulkForm.defaultPassword,
          role: 'student',
          department: bulkForm.department,
          section: bulkForm.section
        });
      }

      const result = await adminUserService.bulkCreate(users);
      setBulkResult(result);
      setShowBulk(false);
      setBulkForm({ startRollNumber: '', endRollNumber: '', emailPattern: '{rollno}@student.edu', namePattern: 'Student {rollno}', department: '', section: '', defaultPassword: 'password123' });
      fetchUsers();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const roleBadge = (role) => {
    const c = { admin: 'bg-rose-100 text-rose-800', faculty: 'bg-teal-100 text-teal-800', student: 'bg-indigo-100 text-indigo-800' };
    return c[role] || 'bg-gray-100 text-gray-800';
  };

  const filtered = users.filter((u) =>
    (u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <div className="space-x-2">
          <button onClick={() => { setShowBulk(true); setShowCreate(false); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Bulk Create</button>
          <button onClick={() => { setShowCreate(true); setShowBulk(false); setEditUser(null); }} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium">Create User</button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-semibold mb-4">Create User</h3>
          <div className="grid grid-cols-2 gap-4">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="px-3 py-2 border rounded-lg outline-none" />
            <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="px-3 py-2 border rounded-lg outline-none" />
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password (min 8)" className="px-3 py-2 border rounded-lg outline-none" />
            <select name="role" value={form.role} onChange={handleChange} className="px-3 py-2 border rounded-lg outline-none">
              <option value="student">Student</option><option value="faculty">Faculty</option><option value="admin">Admin</option>
            </select>
            <input name="department" value={form.department} onChange={handleChange} placeholder="Department" className="px-3 py-2 border rounded-lg outline-none" />
            <input name="section" value={form.section} onChange={handleChange} placeholder="Section (e.g. A)" className="px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div className="flex space-x-2 mt-4">
            <button onClick={handleCreate} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Bulk Create */}
      {showBulk && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-semibold mb-4">Bulk Create Students</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={bulkForm.startRollNumber} onChange={(e) => setBulkForm((f) => ({ ...f, startRollNumber: e.target.value }))} placeholder="Start Roll (e.g. CS001)" className="px-3 py-2 border rounded-lg outline-none" />
            <input value={bulkForm.endRollNumber} onChange={(e) => setBulkForm((f) => ({ ...f, endRollNumber: e.target.value }))} placeholder="End Roll (e.g. CS050)" className="px-3 py-2 border rounded-lg outline-none" />
            <input value={bulkForm.emailPattern} onChange={(e) => setBulkForm((f) => ({ ...f, emailPattern: e.target.value }))} placeholder="Email Pattern" className="px-3 py-2 border rounded-lg outline-none" />
            <input value={bulkForm.namePattern} onChange={(e) => setBulkForm((f) => ({ ...f, namePattern: e.target.value }))} placeholder="Name Pattern" className="px-3 py-2 border rounded-lg outline-none" />
            <input value={bulkForm.department} onChange={(e) => setBulkForm((f) => ({ ...f, department: e.target.value }))} placeholder="Department" className="px-3 py-2 border rounded-lg outline-none" />
            <input value={bulkForm.section} onChange={(e) => setBulkForm((f) => ({ ...f, section: e.target.value }))} placeholder="Section (e.g. A)" className="px-3 py-2 border rounded-lg outline-none" />
            <input value={bulkForm.defaultPassword} onChange={(e) => setBulkForm((f) => ({ ...f, defaultPassword: e.target.value }))} placeholder="Default Password" className="px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div className="flex space-x-2 mt-4">
            <button onClick={handleBulkCreate} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Create Students</button>
            <button onClick={() => setShowBulk(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
          </div>
          {bulkResult && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm">Created: {bulkResult.created || 0} | Errors: {bulkResult.errors?.length || 0}</p>
              {bulkResult.errors && bulkResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-700">
                  {bulkResult.errors.map((err, i) => <div key={i}>{err}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Form */}
      {editUser && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-semibold mb-4">Edit User: {editUser.name}</h3>
          <div className="grid grid-cols-2 gap-4">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="px-3 py-2 border rounded-lg outline-none" />
            <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="px-3 py-2 border rounded-lg outline-none" />
            <select name="role" value={form.role} onChange={handleChange} className="px-3 py-2 border rounded-lg outline-none">
              <option value="student">Student</option><option value="faculty">Faculty</option><option value="admin">Admin</option>
            </select>
            <input name="department" value={form.department} onChange={handleChange} placeholder="Department" className="px-3 py-2 border rounded-lg outline-none" />
            <input name="section" value={form.section} onChange={handleChange} placeholder="Section (e.g. A)" className="px-3 py-2 border rounded-lg outline-none" />
          </div>
          <div className="flex space-x-2 mt-4">
            <button onClick={handleUpdate} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm">Save</button>
            <button onClick={() => setEditUser(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex space-x-4 mb-6">
        <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg outline-none" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-4 py-2 border rounded-lg outline-none">
          <option value="">All Roles</option>
          <option value="admin">Admin</option><option value="faculty">Faculty</option><option value="student">Student</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="text-left py-3 px-4">Name</th><th className="text-left py-3 px-4">Email</th>
              <th className="text-left py-3 px-4">Role</th><th className="text-left py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{u.name}</td>
                  <td className="py-3 px-4">{u.email}</td>
                  <td className="py-3 px-4">
                    {(u.roles || []).map((r) => (
                      <span key={r.role || r} className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-1 ${roleBadge(r.role || r)}`}>{r.role || r}</span>
                    ))}
                  </td>
                  <td className="py-3 px-4 space-x-2">
                    <button onClick={() => {
                      const roleInfo = Array.isArray(u.roleDetails) ? u.roleDetails[0] : null;
                      setEditUser(u);
                      setForm({
                        name: u.name,
                        email: u.email,
                        password: '',
                        role: roleInfo?.role || u.roles?.[0]?.role || u.roles?.[0] || 'student',
                        department: roleInfo?.department || u.roles?.[0]?.department || '',
                        section: roleInfo?.section || u.roles?.[0]?.section || ''
                      });
                      setShowCreate(false);
                      setShowBulk(false);
                    }} className="text-rose-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
