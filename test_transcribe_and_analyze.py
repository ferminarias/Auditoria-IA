import requests

# Configuración
API_BASE_URL = "http://127.0.0.1:8000"
TRANSCRIBE_URL = f"{API_BASE_URL}/transcribe/"
ANALYZE_URL = f"{API_BASE_URL}/analyze/"

# Ruta del archivo de audio
file_path = r"C:\Users\agust\Downloads\3314089248-6377740-20250421091646.mp3"

# Enviar audio al endpoint /transcribe
with open(file_path, "rb") as f:
    files = {"file": ("mi_audio.mp3", f, "audio/mpeg")}
    print("🔁 Enviando audio para transcripción...")
    transcribe_response = requests.post(TRANSCRIBE_URL, files=files)

# Validar respuesta de transcripción
if transcribe_response.status_code != 200:
    print("❌ Error al transcribir:")
    print(transcribe_response.status_code, transcribe_response.text)
    exit()

# Obtener y validar el texto transcripto
transcribed_text = transcribe_response.json().get("text", "").strip()
if not transcribed_text:
    print("⚠️ La transcripción está vacía.")
    exit()

print("✅ Transcripción completa:\n")
print(transcribed_text)

# Enviar texto transcripto al endpoint /analyze
print("\n🔁 Enviando texto para análisis...")
analyze_response = requests.post(ANALYZE_URL, json={"text": transcribed_text})

# Validar respuesta de análisis
if analyze_response.status_code != 200:
    print("❌ Error al analizar:")
    print(analyze_response.status_code, analyze_response.text)
    exit()

analysis = analyze_response.json().get("analysis", [])
print("✅ Análisis de sentimiento:\n")
for result in analysis:
    print(f"- Label: {result['label']} (Score: {result['score']:.2f})")
