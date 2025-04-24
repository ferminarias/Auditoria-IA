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

// Event Listeners
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('bg-gray-50');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('bg-gray-50');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-gray-50');
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFile(file);
});

// Funciones
async function handleFile(file) {
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/wav'];
    if (!validTypes.includes(file.type)) {
        alert('Por favor, selecciona un archivo de audio válido (MP3, M4A o WAV)');
        return;
    }

    // Mostrar indicador de carga
    dropZone.innerHTML = `
        <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
        <p class="text-gray-600">Procesando archivo...</p>
    `;

    try {
        // Transcribir audio
        const transcription = await transcribeAudio(file);
        
        // Analizar texto
        const analysis = await analyzeText(transcription, file.name);
        
        // Mostrar resultados
        displayResults(analysis);
        
        // Guardar análisis actual
        currentAnalysis = analysis;
    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar el archivo. Por favor, intenta de nuevo.');
    }

    // Restaurar drop zone
    dropZone.innerHTML = `
        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
        <p class="text-gray-600">Arrastra tu archivo de audio aquí o</p>
        <label class="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
            Selecciona un archivo
            <input type="file" id="file-input" class="hidden" accept=".mp3,.m4a,.wav">
        </label>
    `;
}

async function transcribeAudio(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:8000/transcribe/', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Error en la transcripción');
    }

    const data = await response.json();
    return data.text;
}

async function analyzeText(text, filename) {
    const response = await fetch('http://localhost:8000/analyze/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: text,
            filename: filename
        })
    });

    if (!response.ok) {
        throw new Error('Error en el análisis');
    }

    const data = await response.json();
    return data.analysis;
}

function displayResults(analysis) {
    // Mostrar sección de resultados
    results.classList.remove('hidden');

    // Actualizar resumen
    callSummary.textContent = analysis.call_summary;

    // Actualizar satisfacción
    satisfaction.textContent = `Nivel: ${analysis.satisfaction} (${(analysis.confidence * 100).toFixed(1)}% de confianza)`;

    // Actualizar categoría
    category.textContent = `Tipo: ${analysis.call_categorization.type} - Tema: ${analysis.call_categorization.topic}`;

    // Actualizar emociones
    emotions.textContent = `Cliente: ${analysis.emotional_analysis.customer_emotion} - Agente: ${analysis.emotional_analysis.agent_emotion}`;

    // Actualizar resolución
    resolution.textContent = `Estado: ${analysis.resolution_tracking.status} - Seguimiento: ${analysis.resolution_tracking.follow_up_required ? 'Requerido' : 'No requerido'}`;

    // Mostrar JSON completo
    jsonResult.textContent = JSON.stringify(analysis, null, 2);
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