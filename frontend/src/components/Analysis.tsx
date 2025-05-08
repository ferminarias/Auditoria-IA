import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, PlayIcon } from '@heroicons/react/24/outline';
import { AnalysisResult } from '../types';

interface AnalysisProps {
  token: string;
  onAnalysisComplete: () => void;
}

interface FileWithAnalysis {
  file: File;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  transcription?: string;
  analysis?: AnalysisResult;
  error?: string;
}

export const Analysis: React.FC<AnalysisProps> = ({ token, onAnalysisComplete }) => {
  const [files, setFiles] = useState<FileWithAnalysis[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const,
      transcription: undefined,
      analysis: undefined,
      error: undefined
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    try {
      await Promise.all(
        pendingFiles.map(async (file) => {
          const fileIndex = files.findIndex(f => f.file === file.file);
          if (fileIndex === -1) return;

          setFiles(prev => {
            const updated = [...prev];
            updated[fileIndex] = { ...file, status: 'analyzing', error: undefined };
            return updated;
          });

          try {
            // Paso 1: Transcribir el audio
            const formData = new FormData();
            formData.append('file', file.file);

            const transcriptionResponse = await fetch('/api/transcribe/', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData,
            });
            
            const transcriptionData = await transcriptionResponse.json();
            if (transcriptionData.error) {
              throw new Error(transcriptionData.error);
            }

            // Paso 2: Analizar el texto
            const analysisResponse = await fetch('/api/analyze/', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: transcriptionData.text,
                filename: file.file.name,
              }),
            });

            const analysisData = await analysisResponse.json();
            if (analysisData.error) {
              throw new Error(analysisData.error);
            }

            setFiles(prev => {
              const updated = [...prev];
              updated[fileIndex] = {
                ...file,
                status: 'completed',
                transcription: transcriptionData.text,
                analysis: analysisData.analysis,
                error: undefined
              };
              return updated;
            });

            onAnalysisComplete();
          } catch (error) {
            setFiles(prev => {
              const updated = [...prev];
              updated[fileIndex] = {
                ...file,
                status: 'error',
                error: error instanceof Error ? error.message : 'Error desconocido'
              };
              return updated;
            });
          }
        })
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/mp4': ['.m4a'],
      'audio/wav': ['.wav'],
    },
    multiple: true,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Importar Llamadas</h2>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-500'}`}
        >
          <input {...getInputProps()} />
          <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">
            {isDragActive
              ? 'Suelta los archivos aquí...'
              : 'Arrastra y suelta archivos de audio aquí'}
          </p>
          <p className="text-sm text-gray-500 mt-2">mp3 · m4a · wav</p>
          <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
            Seleccionar archivos
          </button>
        </div>

        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Archivos cargados ({files.length})</h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <span className="text-sm text-gray-600">{file.file.name}</span>
                  <div className="flex items-center">
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      file.status === 'analyzing' ? 'bg-yellow-100 text-yellow-800' :
                      file.error ? 'bg-red-100 text-red-800' :
                      file.analysis ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {file.status === 'analyzing' ? 'Analizando...' : 
                       file.error ? 'Error' :
                       file.analysis ? 'Analizado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={startAnalysis}
              disabled={isAnalyzing || files.every(f => f.status === 'completed')}
              className={`mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center justify-center w-full
                ${(isAnalyzing || files.every(f => f.status === 'completed')) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <PlayIcon className="h-5 w-5 mr-2" />
              {isAnalyzing ? 'Analizando...' : 'Iniciar Análisis'}
            </button>
          </div>
        )}
      </div>

      {files.some(f => f.analysis) && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
            {files.map((file, index) => (
              file.analysis && (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === index
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {file.file.name}
                </button>
              )
            ))}
          </div>

          {files[activeTab]?.analysis && (
            <div className="mt-8 space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Resumen de Llamada</h2>
                <p className="text-gray-600">{files[activeTab].analysis?.call_summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Satisfacción y Urgencia</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Satisfacción</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        files[activeTab].analysis?.satisfaction === 'MUY SATISFECHO' ? 'bg-green-100 text-green-800' :
                        files[activeTab].analysis?.satisfaction === 'SATISFECHO' ? 'bg-green-50 text-green-600' :
                        files[activeTab].analysis?.satisfaction === 'NEUTRAL' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {files[activeTab].analysis?.satisfaction}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Urgencia</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        files[activeTab].analysis?.urgency === 'ALTA' ? 'bg-red-100 text-red-800' :
                        files[activeTab].analysis?.urgency === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {files[activeTab].analysis?.urgency}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Análisis del Agente</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Profesionalismo</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        files[activeTab].analysis?.agent_analysis.professionalism === 'ALTO' ? 'bg-green-100 text-green-800' :
                        files[activeTab].analysis?.agent_analysis.professionalism === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {files[activeTab].analysis?.agent_analysis.professionalism}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Empatía</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        files[activeTab].analysis?.agent_analysis.empathy === 'ALTO' ? 'bg-green-100 text-green-800' :
                        files[activeTab].analysis?.agent_analysis.empathy === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {files[activeTab].analysis?.agent_analysis.empathy}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 