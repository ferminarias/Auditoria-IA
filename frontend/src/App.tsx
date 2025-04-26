import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, PlayIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';

interface AnalysisResult {
  // Análisis base
  satisfaction: string;
  urgency: string;
  resolution: string;
  tone: string;
  confidence: number;
  original_text: string;
  call_summary: string;
  timestamp: string;
  
  // Análisis de Agente
  agent_analysis: {
    professionalism: string;
    empathy: string;
    solution_effectiveness: string;
    compliance: string;
  };
  
  // Categorización de Llamada
  call_categorization: {
    type: string;
    topic: string;
    priority: string;
  };
  
  // Análisis de Tono y Emoción
  emotional_analysis: {
    customer_emotion: string;
    agent_emotion: string;
    interaction_quality: string;
  };
  
  // Seguimiento de Resolución
  resolution_tracking: {
    status: string;
    resolution_time: string;
    follow_up_required: boolean;
    escalation_level: number;
  };
}

interface FileWithAnalysis {
  file: File;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  transcription?: string;
  analysis?: AnalysisResult;
  error?: string;
}

const App: React.FC = () => {
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
    console.log(newFiles);
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    try {
      // Procesar archivos en paralelo con Promise.all
      await Promise.all(
        pendingFiles.map(async (file) => {
          const fileIndex = files.findIndex(f => f.file === file.file);
          if (fileIndex === -1) return;

          // Actualizar estado a "analizando" para este archivo
          setFiles(prev => {
            const updated = [...prev];
            updated[fileIndex] = { ...file, status: 'analyzing', error: undefined };
            return updated;
          });
          console.log({files});
          console.log({file});
          try {
            // Paso 1: Transcribir el audio
            const formData = new FormData();
            formData.append('file', file.file);

            const transcriptionResponse = await fetch('/api/transcribe/', {
              method: 'POST',
              body: formData,
            });
            
            const transcriptionData = await transcriptionResponse.json();
            console.log({transcriptionData});
            if (transcriptionData.error) {
              throw new Error(transcriptionData.error);
            }

            // Paso 2: Analizar el texto
            const analysisResponse = await fetch('/api/analyze/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: transcriptionData.text,
                filename: file.file.name,
              }),
            });

            const analysisData = await analysisResponse.json();
            console.log({analysisData});
            if (analysisData.error) {
              throw new Error(analysisData.error);
            }

            // Actualizar estado final para este archivo
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
          } catch (error) {
            //  Actualizar estado de error para este archivo
            console.log({error});
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

  const downloadPDF = (fileState: FileWithAnalysis) => {
    if (!fileState.analysis) return;

    const doc = new jsPDF();
    const fileName = fileState.file.name;
    let yPosition = 20;
    const lineHeight = 10;
    const padding = 10;
    const columnWidth = 80;

    // Función auxiliar para crear cajas con estilo
    const drawStyledBox = (title: string, content: { [key: string]: any }, startY: number, width: number = 170) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      const boxHeight = Object.keys(content).length * lineHeight + padding * 2 + 10;
      doc.roundedRect(20, startY, width, boxHeight, 3, 3, 'FD');
      
      // Título
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20 + padding, startY + padding + 5);
      
      // Contenido
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      let contentY = startY + padding + lineHeight + 5;
      
      Object.entries(content).forEach(([key, value]) => {
        // Valor con estilo según el tipo
        let valueStyle = '';
        let bgColor = '';
        
        if (typeof value === 'string') {
          if (['ALTO', 'EFECTIVA', 'POSITIVA', 'MUY SATISFECHO'].includes(value)) {
            bgColor = '#DEF7EC';
            valueStyle = '#03543F';
          } else if (['BAJO', 'NEGATIVA', 'MUY INSATISFECHO'].includes(value)) {
            bgColor = '#FDE8E8';
            valueStyle = '#9B1C1C';
          } else if (['MEDIA', 'NEUTRAL'].includes(value)) {
            bgColor = '#F3F4F6';
            valueStyle = '#4B5563';
          }
        }

        doc.setTextColor(75, 85, 99);
        doc.text(key, 20 + padding, contentY);
        
        if (bgColor) {
          doc.setFillColor(hexToRgb(bgColor).r, hexToRgb(bgColor).g, hexToRgb(bgColor).b);
          const valueWidth = doc.getTextWidth(String(value));
          doc.roundedRect(20 + columnWidth, contentY - 4, valueWidth + 10, 6, 2, 2, 'F');
        }
        
        doc.setTextColor(valueStyle ? hexToRgb(valueStyle).r : 0, valueStyle ? hexToRgb(valueStyle).g : 0, valueStyle ? hexToRgb(valueStyle).b : 0);
        doc.text(String(value), 20 + columnWidth, contentY);
        
        contentY += lineHeight;
      });
      
      return boxHeight;
    };

    // Título principal
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Análisis de Llamada', 20, yPosition);
    yPosition += lineHeight * 2;

    // Resumen
    doc.setFontSize(16);
    const summaryHeight = drawStyledBox('Resumen de Llamada', {
      'Resumen': fileState.analysis.call_summary
    }, yPosition);
    yPosition += summaryHeight + lineHeight;

    // Satisfacción y Urgencia
    const satisfactionHeight = drawStyledBox('Satisfacción y Urgencia', {
      'Satisfacción': fileState.analysis.satisfaction,
      'Urgencia': fileState.analysis.urgency,
      'Confianza': `${(fileState.analysis.confidence * 100).toFixed(1)}%`
    }, yPosition, 82);

    // Análisis del Agente (en paralelo)
    const agentHeight = drawStyledBox('Análisis del Agente', {
      'Profesionalismo': fileState.analysis.agent_analysis.professionalism,
      'Empatía': fileState.analysis.agent_analysis.empathy,
      'Efectividad': fileState.analysis.agent_analysis.solution_effectiveness
    }, yPosition, 82);
    yPosition += Math.max(satisfactionHeight, agentHeight) + lineHeight;

    // Categorización
    const categorizationHeight = drawStyledBox('Categorización', {
      'Tipo': fileState.analysis.call_categorization.type,
      'Tema': fileState.analysis.call_categorization.topic,
      'Prioridad': fileState.analysis.call_categorization.priority
    }, yPosition, 82);

    // Análisis Emocional (en paralelo)
    const emotionalHeight = drawStyledBox('Análisis Emocional', {
      'Emoción del Cliente': fileState.analysis.emotional_analysis.customer_emotion,
      'Emoción del Agente': fileState.analysis.emotional_analysis.agent_emotion,
      'Calidad de Interacción': fileState.analysis.emotional_analysis.interaction_quality
    }, yPosition, 82);
    yPosition += Math.max(categorizationHeight, emotionalHeight) + lineHeight;

    // Estado de Resolución
    drawStyledBox('Estado de Resolución', {
      'Estado': fileState.analysis.resolution_tracking.status,
      'Tiempo de Resolución': fileState.analysis.resolution_tracking.resolution_time,
      'Requiere Seguimiento': fileState.analysis.resolution_tracking.follow_up_required ? 'Sí' : 'No',
      'Nivel de Escalación': `Nivel ${fileState.analysis.resolution_tracking.escalation_level}`
    }, yPosition);

    doc.save(`analisis_${fileName}.pdf`);
  };

  // Función auxiliar para convertir colores hex a RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const downloadJSON = (fileState: FileWithAnalysis) => {
    if (!fileState.analysis) return;
    
    const data = {
      fileName: fileState.file.name,
      transcription: fileState.transcription,
      analysis: fileState.analysis
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analisis_${fileState.file.name}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-radial from-blue-50 via-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">NODS CALIDAD</h1>
        
        {/* Sección de carga de archivos */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Importar Llamadas</h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-blue-50' : 'border-gray-300 hover:border-primary'}`}
          >
            <input {...getInputProps()} />
            <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              {isDragActive
                ? 'Suelta los archivos aquí...'
                : 'Arrastra y suelta archivos de audio aquí'}
            </p>
            <p className="text-sm text-gray-500 mt-2">mp3 · m4a · wav</p>
            <button className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors">
              Seleccionar archivos
            </button>
          </div>

          {/* Lista de archivos cargados */}
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
                className={`mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center w-full
                  ${(isAnalyzing || files.every(f => f.status === 'completed')) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                {isAnalyzing ? 'Analizando...' : 'Iniciar Auditoría'}
              </button>
            </div>
          )}
        </div>

        {/* Pestañas de análisis */}
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
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {file.file.name}
                  </button>
                )
              ))}
            </div>

            {/* Contenido de la pestaña activa */}
            {files[activeTab]?.analysis && (
              <>
                {/* Sección de resultados */}
                {files[activeTab]?.status === 'completed' && (
                  <div className="mt-8 space-y-6">
                    {/* Resumen */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h2 className="text-xl font-semibold mb-4">Resumen de Llamada</h2>
                      <p className="text-gray-600">{files[activeTab].analysis?.call_summary}</p>
                      
                      {/* Botones de descarga */}
                      <div className="mt-4 flex space-x-4">
                        <button
                          onClick={() => downloadPDF(files[activeTab])}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                          </svg>
                          Descargar PDF
                        </button>
                        <button
                          onClick={() => downloadJSON(files[activeTab])}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Descargar JSON
                        </button>
                      </div>
                    </div>

                    {/* Análisis Detallado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Satisfacción y Urgencia */}
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
                              files[activeTab]?.analysis?.urgency === 'ALTA' ? 'bg-red-100 text-red-800' :
                              files[activeTab]?.analysis?.urgency === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {files[activeTab]?.analysis?.urgency || 'BAJA'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Confianza</span>
                            <span className="font-medium">
                              {(() => {
                                const confidence = files[activeTab]?.analysis?.confidence;
                                return confidence !== undefined ? (confidence * 100).toFixed(1) : '0';
                              })()}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Análisis del Agente */}
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Análisis del Agente</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Profesionalismo</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              files[activeTab]?.analysis?.agent_analysis?.professionalism === 'ALTO' ? 'bg-green-100 text-green-800' :
                              files[activeTab]?.analysis?.agent_analysis?.professionalism === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {files[activeTab]?.analysis?.agent_analysis?.professionalism || 'BAJO'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Empatía</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              files[activeTab]?.analysis?.agent_analysis?.empathy === 'ALTO' ? 'bg-green-100 text-green-800' :
                              files[activeTab]?.analysis?.agent_analysis?.empathy === 'MEDIO' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {files[activeTab]?.analysis?.agent_analysis?.empathy || 'BAJO'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Efectividad</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              files[activeTab]?.analysis?.agent_analysis?.solution_effectiveness === 'EFECTIVA' ? 'bg-green-100 text-green-800' :
                              files[activeTab]?.analysis?.agent_analysis?.solution_effectiveness === 'PARCIAL' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {files[activeTab]?.analysis?.agent_analysis?.solution_effectiveness || 'NO EFECTIVA'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Categorización */}
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Categorización</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Tipo</span>
                            <span className="font-medium">{files[activeTab]?.analysis?.call_categorization?.type || 'No especificado'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Tema</span>
                            <span className="font-medium">{files[activeTab]?.analysis?.call_categorization?.topic || 'No especificado'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Prioridad</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              files[activeTab]?.analysis?.call_categorization?.priority === 'ALTA' ? 'bg-red-100 text-red-800' :
                              files[activeTab]?.analysis?.call_categorization?.priority === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {files[activeTab]?.analysis?.call_categorization?.priority || 'BAJA'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Análisis Emocional */}
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Análisis Emocional</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Emoción del Cliente</span>
                            <span className="font-medium">{files[activeTab]?.analysis?.emotional_analysis?.customer_emotion || 'No especificada'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Emoción del Agente</span>
                            <span className="font-medium">{files[activeTab]?.analysis?.emotional_analysis?.agent_emotion || 'No especificada'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Calidad de Interacción</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              files[activeTab]?.analysis?.emotional_analysis?.interaction_quality === 'POSITIVA' ? 'bg-green-100 text-green-800' :
                              files[activeTab]?.analysis?.emotional_analysis?.interaction_quality === 'NEUTRAL' ? 'bg-gray-100 text-gray-600' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {files[activeTab]?.analysis?.emotional_analysis?.interaction_quality || 'NEGATIVA'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Estado de Resolución */}
                      <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2">
                        <h3 className="text-lg font-semibold mb-4">Estado de Resolución</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex justify-between items-center">
                            <span>Estado</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              files[activeTab]?.analysis?.resolution_tracking?.status === 'COMPLETAMENTE RESUELTO' ? 'bg-green-100 text-green-800' :
                              files[activeTab]?.analysis?.resolution_tracking?.status === 'PARCIALMENTE RESUELTO' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {files[activeTab]?.analysis?.resolution_tracking?.status || 'NO RESUELTO'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Tiempo de Resolución</span>
                            <span className="font-medium">{files[activeTab]?.analysis?.resolution_tracking?.resolution_time || 'No especificado'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Requiere Seguimiento</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              files[activeTab]?.analysis?.resolution_tracking?.follow_up_required ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {files[activeTab]?.analysis?.resolution_tracking?.follow_up_required ? 'Sí' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Nivel de Escalación</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              files[activeTab]?.analysis?.resolution_tracking?.escalation_level === 0 ? 'bg-green-100 text-green-800' :
                              files[activeTab]?.analysis?.resolution_tracking?.escalation_level === 1 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              Nivel {files[activeTab]?.analysis?.resolution_tracking?.escalation_level || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;