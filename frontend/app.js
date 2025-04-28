// Configuración
const API_URL = 'http://localhost:8000';

// Elementos del DOM
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const results = document.getElementById('results');
const callSummary = document.getElementById('call-summary');
const satisfaction = document.getElementById('satisfaction');
const category = document.getElementById('category');
const emotions = document.getElementById('emotions');
const resolution = document.getElementById('resolution');
const jsonResult = document.getElementById('json-result');

// Variables globales
let currentAnalysis = null;

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');

    // Event listeners para drag & drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-blue-500');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Event listener para selección de archivo
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Event listener para logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            removeToken();
            window.location.href = 'login.html';
        });
    }
}

// Funciones
async function handleFile(file) {
    try {
        // Validar tipo de archivo
        if (!file.type.startsWith('audio/')) {
            throw new Error('Por favor, selecciona un archivo de audio válido');
        }

        // Mostrar indicador de carga
        showLoading();

        // Transcribir el audio
        const transcription = await transcribeAudio(file);
        
        // Analizar la transcripción
        const analysis = await analyzeText(transcription, file.name);
        
        // Mostrar resultados
        displayResults(analysis);
        
        // Guardar análisis actual
        currentAnalysis = analysis;
        
        // Ocultar indicador de carga
        hideLoading();
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

async function transcribeAudio(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/transcribe/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getToken()}`
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error('Error en la transcripción');
    }

    const data = await response.json();
    return data.text;
}

async function analyzeText(text, filename) {
    const response = await fetch(`${API_URL}/analyze/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
            text: text,
            filename: filename
        })
    });

    if (!response.ok) {
        throw new Error('Error en el análisis');
    }

    return await response.json();
}

function displayResults(data) {
    // Mostrar sección de resultados
    results.classList.remove('hidden');

    // Actualizar resumen
    callSummary.textContent = data.analysis.summary;

    // Actualizar satisfacción
    satisfaction.textContent = 
        `Nivel de satisfacción: ${data.analysis.detailed_analysis.satisfaction}`;

    // Actualizar categoría
    category.textContent = 
        `Categoría: ${data.analysis.detailed_analysis.emotion_analysis.dominant_emotion}`;

    // Actualizar emociones
    emotions.textContent = 
        `Emociones: ${Object.entries(data.analysis.detailed_analysis.emotion_analysis.emotion_scores)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')}`;

    // Actualizar resolución
    resolution.textContent = 
        `Estado: ${data.analysis.detailed_analysis.resolution_status}`;

    // Mostrar JSON completo
    jsonResult.textContent = JSON.stringify(data.analysis, null, 2);
}

function downloadJSON() {
    if (!currentAnalysis) return;

    const blob = new Blob([JSON.stringify(currentAnalysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analisis_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadPDF() {
    if (!currentAnalysis) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Título
    doc.setFontSize(20);
    doc.text('Análisis de Llamada', 20, 20);

    // Resumen
    doc.setFontSize(16);
    doc.text('Resumen', 20, 40);
    doc.setFontSize(12);
    doc.text(currentAnalysis.call_summary, 20, 50);

    // Análisis Detallado
    doc.setFontSize(16);
    doc.text('Análisis Detallado', 20, 80);
    doc.setFontSize(12);

    // Satisfacción
    doc.text(`Satisfacción: ${currentAnalysis.satisfaction}`, 20, 90);
    doc.text(`Confianza: ${(currentAnalysis.confidence * 100).toFixed(1)}%`, 20, 100);

    // Categoría
    doc.text(`Tipo: ${currentAnalysis.call_categorization.type}`, 20, 110);
    doc.text(`Tema: ${currentAnalysis.call_categorization.topic}`, 20, 120);

    // Emociones
    doc.text(`Emoción Cliente: ${currentAnalysis.emotional_analysis.customer_emotion}`, 20, 130);
    doc.text(`Emoción Agente: ${currentAnalysis.emotional_analysis.agent_emotion}`, 20, 140);

    // Resolución
    doc.text(`Estado: ${currentAnalysis.resolution_tracking.status}`, 20, 150);
    doc.text(`Seguimiento: ${currentAnalysis.resolution_tracking.follow_up_required ? 'Requerido' : 'No requerido'}`, 20, 160);

    // Guardar PDF
    doc.save(`analisis_${new Date().toISOString()}.pdf`);
}

// Funciones de utilidad
function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    loadingDiv.className = 'fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50';
    loadingDiv.innerHTML = '<div class="bg-white p-4 rounded-lg">Procesando...</div>';
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Función de autenticación
function getToken() {
    return localStorage.getItem('token') || '';
}

function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
    }
}

function removeToken() {
    localStorage.removeItem('token');
} 