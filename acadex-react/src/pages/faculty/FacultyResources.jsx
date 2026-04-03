import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { courseService } from '../../services';
import { useAuth } from '../../context/AuthContext';

export default function FacultyResources() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resourceType: 'Document',
    resourceUrl: '',
    isVisible: true
  });
  const [resourceInputMode, setResourceInputMode] = useState('link');
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadCoordinatorCourses();
    }
  }, [user?.id]);

  const loadCoordinatorCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.list({ facultyId: user.id });
      setCourses(Array.isArray(data) ? data : []);
      if (data?.length > 0 && !selectedCourse) {
        selectCourse(data[0]);
      }
    } catch (e) {
      console.error(e);
      setMessage('Failed to load courses');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const selectCourse = async (course) => {
    setSelectedCourse(course);
    await loadResources(course.id);
  };

  const loadResources = async (courseId) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/resources/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      } else {
        setResources([]);
      }
    } catch (e) {
      console.error(e);
      setResources([]);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setMessage('Title is required');
      setMessageType('error');
      return;
    }

    if (resourceInputMode === 'link' && !formData.resourceUrl.trim()) {
      setMessage('Resource link is required');
      setMessageType('error');
      return;
    }

    if (resourceInputMode === 'file' && !selectedFile) {
      setMessage('Please choose a file to upload');
      setMessageType('error');
      return;
    }

    try {
      let response;
      if (resourceInputMode === 'file') {
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        uploadData.append('title', formData.title);
        uploadData.append('description', formData.description || '');
        uploadData.append('resourceType', formData.resourceType);
        uploadData.append('isVisible', String(formData.isVisible));

        response = await fetch(`/api/courses/${selectedCourse.id}/resources/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: uploadData
        });
      } else {
        response = await fetch(`/api/courses/${selectedCourse.id}/resources`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(formData)
        });
      }

      if (response.ok) {
        setMessage(resourceInputMode === 'file' ? 'Resource uploaded successfully' : 'Resource link added successfully');
        setMessageType('success');
        setShowAdd(false);
        setFormData({
          title: '',
          description: '',
          resourceType: 'Document',
          resourceUrl: '',
          isVisible: true
        });
        setResourceInputMode('link');
        setSelectedFile(null);
        await loadResources(selectedCourse.id);
      } else {
        const responseText = await response.text();
        let errorMessage = 'Failed to add resource';

        if (responseText) {
          try {
            const error = JSON.parse(responseText);
            errorMessage = error.error || error.message || errorMessage;
          } catch {
            errorMessage = responseText;
          }
        }

        setMessage(errorMessage);
        setMessageType('error');
      }
    } catch (e) {
      console.error(e);
      setMessage('Error adding resource');
      setMessageType('error');
    }
  };

  const handleToggleVisibility = async (resourceId, currentVisibility) => {
    try {
      const response = await fetch(`/api/courses/${selectedCourse.id}/resources/${resourceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ isVisible: !currentVisibility })
      });

      if (response.ok) {
        setMessage(`Resource ${!currentVisibility ? 'shown' : 'hidden'}`);
        setMessageType('success');
        await loadResources(selectedCourse.id);
      } else {
        setMessage('Failed to update resource');
        setMessageType('error');
      }
    } catch (e) {
      console.error(e);
      setMessage('Error updating resource');
      setMessageType('error');
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;

    try {
      setDeleting(resourceId);
      const response = await fetch(`/api/courses/${selectedCourse.id}/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        setMessage('Resource deleted successfully');
        setMessageType('success');
        await loadResources(selectedCourse.id);
      } else {
        setMessage('Failed to delete resource');
        setMessageType('error');
      }
    } catch (e) {
      console.error(e);
      setMessage('Error deleting resource');
      setMessageType('error');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return (
    <DashboardLayout role="faculty">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout role="faculty">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Course Resources</h1>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Course Selector */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-bold text-lg mb-4">My Courses</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {courses.length === 0 ? (
                <p className="text-gray-500 text-sm">No courses assigned</p>
              ) : (
                courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => selectCourse(course)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedCourse?.id === course.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold text-sm">{course.courseCode}</div>
                    <div className="text-xs">{course.courseName}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Resources Panel */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow p-6">
            {selectedCourse ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedCourse.courseCode}</h2>
                    <p className="text-gray-600">{selectedCourse.courseName}</p>
                  </div>
                  <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
                  >
                    {showAdd ? 'Cancel' : '+ Add Resource'}
                  </button>
                </div>

                {/* Add Resource Form */}
                {showAdd && (
                  <form onSubmit={handleAddResource} className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-teal-300">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Resource Input</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setResourceInputMode('link');
                              setSelectedFile(null);
                            }}
                            className={`px-3 py-2 rounded-lg border ${
                              resourceInputMode === 'link'
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            Add Link
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResourceInputMode('file');
                              setFormData({ ...formData, resourceUrl: '' });
                            }}
                            className={`px-3 py-2 rounded-lg border ${
                              resourceInputMode === 'file'
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            Upload Document
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="e.g., Lecture Notes - Chapter 1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          rows="3"
                          placeholder="Optional description"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Resource Type</label>
                          <select
                            value={formData.resourceType}
                            onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option>Document</option>
                            <option>PDF</option>
                            <option>Video</option>
                            <option>Link</option>
                            <option>Image</option>
                            <option>Audio</option>
                            <option>Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Visible to Students</label>
                          <select
                            value={formData.isVisible}
                            onChange={(e) => setFormData({ ...formData, isVisible: e.target.value === 'true' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                      </div>

                      {resourceInputMode === 'link' ? (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Resource URL *</label>
                          <input
                            type="text"
                            value={formData.resourceUrl}
                            onChange={(e) => setFormData({ ...formData, resourceUrl: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="https://example.com/resource"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Select File *</label>
                          <input
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.jpg,.jpeg,.png,.mp4,.mp3"
                          />
                          {selectedFile && (
                            <p className="mt-1 text-xs text-gray-600">Selected: {selectedFile.name}</p>
                          )}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 font-semibold"
                      >
                        Upload Resource
                      </button>
                    </div>
                  </form>
                )}

                {/* Resources List */}
                <div>
                  <h3 className="font-bold text-lg mb-4">Resources ({resources.length})</h3>
                  {resources.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No resources yet. Add one to get started!</p>
                  ) : (
                    <div className="space-y-3">
                      {resources.map(resource => (
                        <div key={resource.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-800">{resource.title}</h4>
                              <span className={`text-xs px-2 py-1 rounded ${resource.isVisible ? 'bg-green-100 text-green-800' : 'bg-gray-300 text-gray-700'}`}>
                                {resource.isVisible ? 'Visible' : 'Hidden'}
                              </span>
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">{resource.resourceType}</span>
                            </div>
                            {resource.description && (
                              <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              Uploaded by {resource.uploadedBy} on {new Date(resource.uploadedAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-teal-600 mt-1 break-all">
                              {resource.resourceUrl}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleVisibility(resource.id, resource.isVisible)}
                              className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
                            >
                              {resource.isVisible ? 'Hide' : 'Show'}
                            </button>
                            <button
                              onClick={() => handleDeleteResource(resource.id)}
                              disabled={deleting === resource.id}
                              className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              {deleting === resource.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select a course to manage resources
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
