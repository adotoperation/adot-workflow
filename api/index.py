import json
import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import gspread
from oauth2client.service_account import ServiceAccountCredentials

app = Flask(__name__)
CORS(app)

SPREADSHEET_ID = "1lKT-goj4VjpOaYpISwSpdPCsH2I54asdTZ778JM7-9M"
WORKSHEET_NAME = "워크플로우맵"

def get_gspread_client():
    # Attempt to load credentials from Environment Variable (for Vercel)
    # or fallback to local file (for local testing)
    google_key_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT')
    
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    
    if google_key_json:
        # Reconstruct credentials from JSON string in Env Var
        key_data = json.loads(google_key_json)
        creds = ServiceAccountCredentials.from_json_keyfile_dict(key_data, scope)
    else:
        # Fallback to local file with absolute path resolution
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        key_file = os.path.join(base_dir, 'backend', 'google-key.json')
        
        if not os.path.exists(key_file):
            # Try same directory as a last resort
            key_file = os.path.join(base_dir, 'google-key.json')
            
        if not os.path.exists(key_file):
            raise FileNotFoundError(f"Google credentials not found. Checked: {key_file}")
            
        creds = ServiceAccountCredentials.from_json_keyfile_name(key_file, scope)
        
    return gspread.authorize(creds)

@app.route('/api/saveWorkflow', methods=['POST'])
def save_workflow():
    try:
        data = request.json
        # Handle both direct JSON and GAS-style wrapper
        if 'action' in data and data['action'] == 'saveWorkflow':
            user_id = data.get('userId', 'default')
            job_name = data.get('jobName', 'untitled')
            flow_data = data.get('flowData') 
        else:
            return jsonify({"status": "error", "message": "Invalid action"}), 400

        # Sync to Google Sheets (Primary Storage in Cloud)
        client = get_gspread_client()
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet(WORKSHEET_NAME)
        
        # Parse flow data
        flow_json = json.loads(flow_data) if isinstance(flow_data, str) else flow_data
        nodes = flow_json.get('nodes', [])
        
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        rows = []
        for node in nodes:
            node_data = node.get('data', {})
            row = [
                timestamp,
                user_id,
                job_name,
                node.get('id'),
                node.get('type'),
                node_data.get('label', ''),
                node_data.get('team', ''),
                node_data.get('person', ''),
                node_data.get('method', node_data.get('applicant', '')),
                node_data.get('automation', '수동')
            ]
            rows.append(row)

        if rows:
            sheet.append_rows(rows)
            return jsonify({
                "status": "success", 
                "message": f"Successfully synced {len(rows)} nodes to Google Sheets"
            })
        
        return jsonify({"status": "error", "message": "No nodes to sync"}), 400
        
    except Exception as e:
        print(f"[ERROR] Save failed: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/getTeams', methods=['GET'])
def get_teams():
    try:
        client = get_gspread_client()
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet("팀명")
        teams = sheet.col_values(1)[1:] 
        return jsonify({"status": "success", "data": teams})
    except Exception as e:
        print(f"[ERROR] Fetch teams failed: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# Vercel requires the app instance to be named 'app'
if __name__ == '__main__':
    app.run(port=5001, debug=True)
