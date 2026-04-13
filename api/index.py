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
        if data.get('action') == 'saveWorkflow':
            user_id = data.get('userId', 'default')
            workflow_id = data.get('workflowId', f"WF-{int(datetime.now().timestamp())}")
            job_name = data.get('jobName', 'untitled')
            flow_data = data.get('flowData') 
        else:
            return jsonify({"status": "error", "message": f"Unsupported action: {data.get('action')}"}), 400

        # Sync to Google Sheets
        try:
            client = get_gspread_client()
            sheet = client.open_by_key(SPREADSHEET_ID).worksheet(WORKSHEET_NAME)
        except Exception as auth_err:
            print(f"[AUTH ERROR] Google Sheet connection failed: {str(auth_err)}")
            return jsonify({"status": "error", "message": f"Google Sheets connection failed: {str(auth_err)}"}), 503
        
        # Parse flow data (handle string or dict)
        try:
            if isinstance(flow_data, str):
                # Replace potential single quotes if it's not a valid JSON string (common in manual tests)
                # but App.jsx uses JSON.stringify, so it should be fine.
                flow_json = json.loads(flow_data)
            else:
                flow_json = flow_data
        except Exception as json_err:
            print(f"[JSON ERROR] Failed to parse flow_data: {str(json_err)}\nData: {flow_data}")
            return jsonify({"status": "error", "message": f"Invalid flow data format: {str(json_err)}"}), 400
        nodes = flow_json.get('nodes', [])
        
        # Format date as YYYY-MM-DD per user request
        timestamp = datetime.now().strftime('%Y-%m-%d')
        
        rows = []
        for node in nodes:
            node_data = node.get('data', {})
            row = [
                timestamp,      # 저장시간 (연-월-일)
                workflow_id,    # 워크플로우 아이디
                user_id,        # 사용자 아이디
                job_name,       # 제목
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
                "message": f"Successfully synced {len(rows)} nodes with Workflow ID {workflow_id}"
            })
        
        return jsonify({"status": "error", "message": "No nodes to sync"}), 400
        
    except Exception as e:
        print(f"[ERROR] Save failed: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/loadWorkflow', methods=['GET'])
def load_workflow():
    try:
        user_id = request.args.get('userId')
        job_name = request.args.get('jobName')
        
        client = get_gspread_client()
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet(WORKSHEET_NAME)
        all_rows = sheet.get_all_values()[1:] # Skip header
        
        if not user_id:
            return jsonify({"status": "error", "message": "UserId is required"}), 400

        # If jobName is not provided, list all available workflows for this user
        if not job_name:
            workflows = {}
            for row in all_rows:
                # row[0]: date, row[1]: workflowId, row[2]: userId, row[3]: jobName
                if len(row) >= 4 and row[2] == user_id:
                    wf_name = row[3]
                    wf_id = row[1]
                    if wf_name not in workflows:
                        workflows[wf_name] = {
                            "updatedAt": row[0],
                            "workflowId": wf_id,
                            "flowData": json.dumps({"nodes": []})
                        }
            return jsonify({"status": "success", "data": workflows})

        # Load specific workflow nodes
        nodes = []
        workflow_id = None
        for row in all_rows:
            if len(row) >= 11 and row[2] == user_id and row[3] == job_name:
                workflow_id = row[1]
                node = {
                    "id": row[4],
                    "type": row[5],
                    "data": {
                        "label": row[6],
                        "team": row[7],
                        "person": row[8],
                        "method": row[9],
                        "automation": row[10]
                    },
                    "position": {"x": 850, "y": 350} 
                }
                nodes.append(node)
        
        if not nodes:
            return jsonify({"status": "error", "message": "Workflow not found"}), 404

        # Return reconstructed flow data
        return jsonify({
            "status": "success",
            "data": {
                "jobName": job_name,
                "workflowId": workflow_id,
                "flowData": json.dumps({"nodes": nodes, "edges": []})
            }
        })
        
    except Exception as e:
        print(f"[ERROR] Load failed: {str(e)}")
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

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        client = get_gspread_client()
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet("회원정보")
        
        # A: 팀명, B: 이름, C: 아이디, D: 비밀번호, E: 사내 이메일
        row = [
            data.get('team'),
            data.get('name'),
            data.get('userId'),
            data.get('password'),
            data.get('email')
        ]
        
        sheet.append_row(row)
        return jsonify({"status": "success", "message": "Signup successful"})
    except Exception as e:
        print(f"[ERROR] Signup failed: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/checkId', methods=['POST'])
def check_id():
    try:
        user_id = request.json.get('userId')
        client = get_gspread_client()
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet("회원정보")
        
        # Get all IDs from column C (3rd column)
        ids = sheet.col_values(3)
        
        if user_id in ids:
            return jsonify({"result": "fail", "message": "ID already exists"})
        return jsonify({"result": "success", "message": "ID available"})
    except Exception as e:
        print(f"[ERROR] ID check failed: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# Vercel requires the app instance to be named 'app'
if __name__ == '__main__':
    app.run(port=5001, debug=True)
