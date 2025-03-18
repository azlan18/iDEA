from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
from transformers import pipeline
from googletrans import Translator
import os
import logging
import subprocess
from werkzeug.serving import WSGIRequestHandler

# Increase the timeout
WSGIRequestHandler.protocol_version = "HTTP/1.1"

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Increase Flask's timeout
app.config['TIMEOUT'] = 300  # 5 minutes

translator = Translator()

# Configure paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

# Create necessary directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_ffmpeg():
    """Check if ffmpeg is available and working"""
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, check=True)
        logger.info(f"ffmpeg check passed: {result.stdout.splitlines()[0]}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg check failed: {e.stderr}")
        return False
    except FileNotFoundError:
        logger.error("ffmpeg not found in system PATH. Please install via 'brew install ffmpeg'.")
        return False
    except Exception as e:
        logger.error(f"Error checking ffmpeg: {e}")
        return False

def transcribe_audio(audio_path):
    """Transcribe audio file using Whisper"""
    try:
        logger.debug(f"Attempting to transcribe: {audio_path}")
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found at {audio_path}")
        
        if not check_ffmpeg():
            raise RuntimeError("ffmpeg is not installed or not in PATH. Install with 'brew install ffmpeg'")

        logger.debug("Loading Whisper model 'base'")
        model = whisper.load_model("base")
        logger.debug("Model loaded successfully, starting transcription")
        result = model.transcribe(audio_path, language=None)
        logger.debug(f"Transcription completed: {result['text']}, Language: {result['language']}")
        return result["text"], result["language"]
    except Exception as e:
        logger.error(f"Error in transcription: {str(e)}", exc_info=True)
        raise

def translate_to_english(text, source_lang):
    if source_lang == "en":
        return text
    try:
        logger.debug(f"Translating text from {source_lang} to English")
        translated = translator.translate(text, src=source_lang, dest="en")
        logger.debug(f"Translation result: {translated.text}")
        return translated.text
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return text

def analyze_sentiment(text):
    try:
        logger.debug("Loading sentiment analysis pipeline")
        sentiment_analyzer = pipeline("sentiment-analysis")
        result = sentiment_analyzer(text)[0]
        logger.debug(f"Sentiment analysis result: {result}")
        return result["label"], result["score"]
    except Exception as e:
        logger.error(f"Sentiment analysis error: {str(e)}")
        raise

def classify_department(text):
    text = text.lower()
    department_keywords = {
        "Loan & Credit Department": [
            "loan", "emi", "credit", "interest", "period", "calculation", "rate",
            "principal", "tenure", "repayment", "borrowing", "lending", "mortgage"
        ],
        "Retail Banking & Customer Support": [
            "balance", "debit", "atm", "otp", "account", "customer", "issue",
            "problem", "help", "support", "resolve", "assist", "service"
        ],
        "Payments & Clearing Department": [
            "cheque", "rtgs", "neft", "imps", "transfer", "payment", "transaction",
            "deposit", "withdraw", "upi", "online", "mobile banking"
        ],
        "Wealth Management & Deposit Services": [
            "fd", "rd", "fixed deposit", "recurring deposit", "investment",
            "savings", "interest rate", "maturity", "term deposit"
        ],
        "Regulatory & Compliance Department": [
            "kyc", "pan", "cibil", "tax", "document", "verification", "compliance",
            "regulation", "policy", "guidelines", "rules"
        ]
    }
    
    words = set(text.split())
    department_scores = {dept: 0 for dept in department_keywords}
    
    for dept, keywords in department_keywords.items():
        for keyword in keywords:
            if keyword in words:
                department_scores[dept] += 2
            elif keyword in text:
                department_scores[dept] += 1
    
    max_score = max(department_scores.values())
    if max_score == 0:
        logger.debug("No department detected")
        return None
    
    top_departments = [dept for dept, score in department_scores.items() if score == max_score]
    logger.debug(f"Department scores: {department_scores}")
    logger.debug(f"Selected department: {top_departments[0]}")
    
    return top_departments[0]

def filter_transcription(text):
    text = text.lower()
    disallowed_keywords = ["rob", "steal", "hack", "illegal", "scam"]
    for keyword in disallowed_keywords:
        if keyword in text:
            logger.warning(f"Inappropriate content detected: '{keyword}'")
            return False, f"Query rejected: Inappropriate content detected ('{keyword}')"
    return True, ""

@app.route('/process', methods=['POST'])
def process_query():
    try:
        logger.debug("Received request to /process")
        data = request.get_json()
        
        if not data:
            logger.error("No JSON data received")
            return jsonify({'error': 'No JSON data received'}), 400
        
        file_name = data.get('file_name')
        if not file_name:
            logger.error("No file_name provided in request")
            return jsonify({'error': 'No file_name provided'}), 400
        
        file_path = os.path.join(UPLOAD_FOLDER, file_name)
        logger.debug(f"Processing file at: {file_path}")
        
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return jsonify({'error': f'File not found: {file_path}'}), 404

        is_video = file_path.lower().endswith((".mp4", ".avi", ".mov"))
        transcription, language = transcribe_audio(file_path)
        
        translated_text = translate_to_english(transcription, language)
        is_valid, filter_message = filter_transcription(translated_text)
        
        response = {'file_id': file_name}
        
        if not is_valid:
            response.update({
                'error': filter_message,
                'transcription': transcription
            })
            logger.info(f"Request rejected due to filter: {filter_message}")
            return jsonify(response)
            
        sentiment, confidence = analyze_sentiment(translated_text)
        department = classify_department(translated_text)
        
        response.update({
            'transcription': transcription,
            'translated_text': translated_text,
            'sentiment': sentiment,
            'confidence': float(confidence),
            'department': department,
            'language': language,
            'file_path': f'/api/media/{file_name}'
        })
        
        logger.debug(f"Response before sending: {response}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Processing error: {str(e)}", exc_info=True)
        return jsonify({'error': f'Processing error: {str(e)}'}), 500

if __name__ == '__main__':
    logger.info("Processing server starting...")
    app.run(debug=True, host='localhost', port=5001, threaded=True)