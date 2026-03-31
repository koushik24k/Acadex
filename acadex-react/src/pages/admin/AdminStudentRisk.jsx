import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { analyticsService } from '../../services';

export default function AdminStudentRisk() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        analyticsService.getStudentRisk()
            .then(data => {
                setStudents(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const viewDetails = (studentId) => {
        analyticsService.getStudentRisk(studentId)
            .then(data => {
                setSelectedStudent(data);
            })
            .catch(() => alert('Failed to fetch student details'));
    };

    const renderRiskLevel = (level) => {
        const styles = {
            LOW: 'bg-green-100 text-green-800',
            MEDIUM: 'bg-yellow-100 text-yellow-800',
            HIGH: 'bg-red-100 text-red-800',
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[level]}`}>{level}</span>;
    };

    const renderStudentTable = () => (
        <div className="bg-white rounded-xl shadow-sm border p-6">
            <table className="min-w-full">
                <thead>
                    <tr>
                        <th className="px-4 py-2 text-left">Student Name</th>
                        <th className="px-4 py-2 text-left">Risk Score</th>
                        <th className="px-4 py-2 text-left">ML Predicted Risk</th>
                        <th className="px-4 py-2 text-left">Confidence</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map(s => (
                        <tr key={s.studentId} className="border-b">
                            <td className="px-4 py-2">{s.studentName}</td>
                            <td className="px-4 py-2">{s.riskScore}</td>
                            <td className="px-4 py-2">{renderRiskLevel(s.mlPredictedRisk || s.riskLevel)}</td>
                            <td className="px-4 py-2">{typeof s.mlConfidence === 'number' ? `${(s.mlConfidence * 100).toFixed(1)}%` : 'N/A'}</td>
                            <td className="px-4 py-2">
                                <button onClick={() => viewDetails(s.studentId)} className="text-blue-600">View Details</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderStudentDetails = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
                <h2 className="text-2xl font-bold mb-4">{selectedStudent.studentName}</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div><strong>Risk Score:</strong> {selectedStudent.riskScore}</div>
                    <div><strong>ML Predicted Risk:</strong> {renderRiskLevel(selectedStudent.mlPredictedRisk || selectedStudent.riskLevel)}</div>
                    <div><strong>Confidence:</strong> {typeof selectedStudent.mlConfidence === 'number' ? `${(selectedStudent.mlConfidence * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div><strong>Prediction Source:</strong> {selectedStudent.predictionSource || 'RULE_BASED_FALLBACK'}</div>
                    <div><strong>Attendance:</strong> {selectedStudent.attendancePercentage}%</div>
                    <div><strong>Assignment Avg:</strong> {selectedStudent.assignmentAverage}%</div>
                    <div><strong>Exam Avg:</strong> {selectedStudent.examScoreAverage}%</div>
                </div>
                <div className="mt-4">
                    <h3 className="font-bold">Flags:</h3>
                    <ul className="list-disc list-inside">
                        {selectedStudent.flags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                </div>
                <div className="flex justify-end mt-6">
                    <button onClick={() => setSelectedStudent(null)} className="px-4 py-2 bg-gray-200 rounded-lg">Close</button>
                </div>
            </div>
        </div>
    );

    return (
        <DashboardLayout role="admin">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Risk Assessment</h1>
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
                </div>
            ) : (
                renderStudentTable()
            )}
            {selectedStudent && renderStudentDetails()}
        </DashboardLayout>
    );
}
