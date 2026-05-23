'use client';

import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Plus } from 'lucide-react';

export default function SyllabusAI({ onSync }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];
    if (selectedFile && allowedTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please upload a PDF, Image, or Text file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('syllabus', file);

    try {
      const response = await fetch('http://localhost:9003/upload-syllabus', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to process syllabus');

      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (err) {
      setError(err.message || 'Error connecting to AI Bridge. Make sure the app is running correctly.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToAgenda = () => {
    if (onSync && assignments.length > 0) {
      onSync(assignments);
      setAssignments([]);
      setFile(null);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Syllabus AI</h2>
        <p className="text-slate-500 mt-1">Upload your syllabus and let AI extract all your assignments automatically.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        {!assignments.length ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
              <Upload className="text-teal-600" size={32} />
            </div>
            
            <h3 className="text-lg font-bold text-slate-800">Upload Syllabus</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">PDF, Images, or Text (max 10MB)</p>
            
            <input 
              type="file" 
              id="syllabus-upload" 
              className="hidden" 
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              onChange={handleFileChange}
            />
            
            <label 
              htmlFor="syllabus-upload"
              className="bg-white border border-slate-200 text-slate-700 px-6 py-2 rounded-full font-medium cursor-pointer hover:bg-slate-50 transition-colors mb-4"
            >
              {file ? file.name : 'Choose File'}
            </label>

            {file && (
              <button 
                onClick={handleUpload}
                disabled={loading}
                className="bg-teal-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                {loading ? 'Processing...' : 'Analyze Syllabus'}
              </button>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 text-red-500 text-sm font-medium">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                <CheckCircle2 className="text-teal-500" />
                Extracted Assignments ({assignments.length})
              </h3>
              <button 
                onClick={() => {setAssignments([]); setFile(null);}}
                className="text-sm text-slate-400 hover:text-slate-600 font-medium"
              >
                Upload Another
              </button>
            </div>

            <div className="space-y-4">
              {assignments.map((task, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-teal-100 hover:bg-teal-50/30 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-teal-600 transition-colors">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800">{task.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{task.course || 'General'}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="text-xs text-slate-500">Due: {task.dueDate || 'No Date'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleSyncToAgenda}
              className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
            >
              Add All to My Agenda
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 bg-teal-50 rounded-3xl p-6 flex items-start gap-4 border border-teal-100">
        <div className="p-2 bg-white rounded-xl shadow-sm">
          <AlertCircle className="text-teal-600" size={24} />
        </div>
        <div>
          <h4 className="font-bold text-teal-900">How it works</h4>
          <p className="text-sm text-teal-700 mt-1">
            Our AI reads your syllabus PDF and identifies key dates for assignments, quizzes, and exams. 
            Review the extracted list and add them to your calendar with one click.
          </p>
        </div>
      </div>
    </div>
  );
}
