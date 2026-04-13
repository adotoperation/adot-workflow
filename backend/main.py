import json
import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import gspread
from oauth2client.service_account import ServiceAccountCredentials

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'workflows.json')
GOOGLE_KEY_FILE = os.path.join(os.path.dirname(__file__), 'google-key.json')
SPREADSHEET_ID = "1lKT-goj4VjpOaYpISwSpdPCsH2I54asdTZ778JM7-9M"
WORKSHEET_NAME = "워크플로우맵"

# Ensure data directory and file exist
if not os.path.exists(os.path.dirname(DATA_FILE)):
    os.makedirs(os.path.dirname(DATA_FILE))

if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump({}, f)

@app.route('/api/saveWorkflow', methods=['POST'])
def save_workflow():
    try:
        data = request.json
        # Handle both direct JSON and GAS-style wrapper
        if 'action' in data and data['action'] == 'saveWorkflow':
            user_id = data.get('userId', 'default')
            job_name = data.get('jobName', 'untitled')
            flow_data = data.get('flowData') # This is usually a JSON string
        else:
            return jsonify({"status": "error", "message": "Invalid action"}), 400

        # Load existing data
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            workflows = json.load(f)

        # Save or update
        if user_id not in workflows:
            workflows[user_id] = {}
        
        workflows[user_id][job_name] = {
            "flowData": flow_data,
            "updatedAt": os.path.getmtime(DATA_FILE) if os.path.exists(DATA_FILE) else None
        }

        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(workflows, f, ensure_ascii=False, indent=2)

        # Sync to Google Sheets
        sync_result = sync_to_google_sheet(user_id, job_name, flow_data)

        return jsonify({
            "status": "success", 
            "message": "Workflow saved locally",
            "google_sheet_sync": sync_result
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/loadWorkflow', methods=['GET'])
def load_workflow():
    user_id = request.args.get('userId', 'default')
    job_name = request.args.get('jobName')

    try:
        if not os.path.exists(DATA_FILE):
            return jsonify({"status": "error", "message": "No data found"}), 404

        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            workflows = json.load(f)

        if user_id in workflows:
            if job_name and job_name in workflows[user_id]:
                return jsonify({"status": "success", "data": workflows[user_id][job_name]})
            return jsonify({"status": "success", "data": workflows[user_id]})
        
        return jsonify({"status": "error", "message": "User not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

def sync_to_google_sheet(user_id, job_name, flow_data_str):
    try:
        if not os.path.exists(GOOGLE_KEY_FILE):
            return "Key file missing"

        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = ServiceAccountCredentials.from_json_keyfile_name(GOOGLE_KEY_FILE, scope)
        client = gspread.authorize(creds)
        
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet(WORKSHEET_NAME)
        
        # Parse flow data
        flow_json = json.loads(flow_data_str)
        nodes = flow_json.get('nodes', [])
        
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Prepare rows
        # Format: Timestamp, UserID, JobName, NodeID, Type, Label, Team, Person, Method/Applicant, Automation
        rows = []
        for node in nodes:
            data = node.get('data', {})
            row = [
                timestamp,
                user_id,
                job_name,
                node.get('id'),
                node.get('type'),
                data.get('label', ''),
                data.get('team', ''),
                data.get('person', ''),
                data.get('method', data.get('applicant', '')),
                data.get('automation', '수동')
            ]
            rows.append(row)

        if rows:
            # Append to the end of the sheet
            sheet.append_rows(rows)
            return f"Synced {len(rows)} nodes"
        return "No nodes to sync"
    except Exception as e:
        return f"Sync failed: {str(e)}"

@app.route('/api/getTeams', methods=['GET'])
def get_teams():
    try:
        if not os.path.exists(GOOGLE_KEY_FILE):
            return jsonify({"status": "error", "message": "Key file missing"}), 500

        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = ServiceAccountCredentials.from_json_keyfile_name(GOOGLE_KEY_FILE, scope)
        client = gspread.authorize(creds)
        
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet("팀명")
        # Fetch Column A, skip the first row (header)
        teams = sheet.col_values(1)[1:] 
        
        return jsonify({"status": "success", "data": teams})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # Listen on all interfaces to allow internal host access
    app.run(host='0.0.0.0', port=5000, debug=True)
