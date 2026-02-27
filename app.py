from flask import Flask, jsonify, send_from_directory
import json
import os
from detection import run_analysis

app = Flask(__name__, static_folder='.')

# --- ROUTES ---

@app.route('/')
def index():
    """Serve the main dashboard page."""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve static files (css, js, json)."""
    return send_from_directory(app.static_folder, path)

@app.route('/api/logs')
def get_logs():
    """Returns the full content of logs.json."""
    try:
        with open('logs.json', 'r') as f:
            logs = json.load(f)
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/alerts')
def get_alerts():
    """Runs the detection engine and returns identified incidents."""
    try:
        # Run detection.py logic
        incidents = run_analysis()
        return jsonify(incidents)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/report')
def get_report():
    """Returns the raw text content of the incident report."""
    try:
        if not os.path.exists('incident_report.txt'):
            run_analysis()
            
        with open('incident_report.txt', 'r') as f:
            content = f.read()
        return jsonify({"report": content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    """GET: Return current settings. POST: Update settings."""
    settings_path = 'settings.json'
    
    if os.environ.get('REQUEST_METHOD') == 'POST' or True: # Flask handles methods via decorator
        from flask import request
        if request.method == 'POST':
            try:
                new_settings = request.json
                with open(settings_path, 'w') as f:
                    json.dump(new_settings, f, indent=2)
                return jsonify({"status": "success", "message": "Settings updated"})
            except Exception as e:
                return jsonify({"error": str(e)}), 500
                
    try:
        if not os.path.exists(settings_path):
            defaults = {
                "failed_login_limit": 3,
                "large_download_threshold": 100,
                "data_upload_threshold": 500
            }
            with open(settings_path, 'w') as f:
                json.dump(defaults, f, indent=2)
                
        with open(settings_path, 'r') as f:
            settings = json.load(f)
        return jsonify(settings)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("SOC Campus Backend starting on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
