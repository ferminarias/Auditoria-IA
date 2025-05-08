import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Recording, RecordingStats } from '../types';

interface RecordingsProps {
  token: string;
}

export const Recordings: React.FC<RecordingsProps> = ({ token }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [stats, setStats] = useState<RecordingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordingsResponse, statsResponse] = await Promise.all([
          fetch('/api/recordings', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch('/api/recordings/stats', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        ]);

        if (!recordingsResponse.ok || !statsResponse.ok) {
          throw new Error('Error al cargar los datos');
        }

        const recordingsData = await recordingsResponse.json();
        const statsData = await statsResponse.json();

        setRecordings(recordingsData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-600 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Grabaciones</h1>
        <p className="mt-2 text-sm text-gray-600">
          Total de grabaciones: {stats?.totalRecordings || 0}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recordings.map((recording) => (
          <div
            key={recording.id}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">
                {recording.filename}
              </h3>
              <div className="mt-2 text-sm text-gray-500">
                <p>Duración: {recording.duration} segundos</p>
                <p>Fecha: {new Date(recording.created_at).toLocaleDateString()}</p>
                {recording.lastAnalyzed && (
                  <p>Último análisis: {new Date(recording.lastAnalyzed).toLocaleDateString()}</p>
                )}
              </div>
              <div className="mt-4">
                <Link
                  to={`/analysis/${recording.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Ver Análisis
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recordings.length === 0 && (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay grabaciones</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza subiendo una grabación para analizarla.
          </p>
          <div className="mt-6">
            <Link
              to="/analysis"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Subir Grabación
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}; 