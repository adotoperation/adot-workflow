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
        
        # Parse flow data
        try:
            if isinstance(flow_data, str):
                flow_json = json.loads(flow_data)
            else:
                flow_json = flow_data
        except Exception as json_err:
            print(f"[JSON ERROR] Failed to parse flow_data: {str(json_err)}\nData: {flow_data}")
            return jsonify({"status": "error", "message": f"Invalid flow data format: {str(json_err)}"}), 400
        
        nodes = flow_json.get('nodes', [])
        edges = flow_json.get('edges', [])
        
        # Cleanup PREVIOUS version of this workflowId to prevent duplicates [Robust Addition]
        try:
            all_data = sheet.get_all_values()
            # Find row indices to delete (Column B is index 1)
            # We iterate in reverse to avoid index shifting during deletion
            indices_to_delete = []
            for idx, row in enumerate(all_data):
                if len(row) > 1 and row[1] == workflow_id:
                    indices_to_delete.append(idx + 1) # gspread is 1-indexed
            
            if indices_to_delete:
                # Group contiguous indices if possible, or delete one by one in reverse
                # For simplicity and reliability with smaller datasets:
                for idx in reversed(indices_to_delete):
                    sheet.delete_rows(idx)
                print(f"[DEBUG] Cleaned up {len(indices_to_delete)} old rows for WF ID: {workflow_id}")
        except Exception as clean_err:
             print(f"[WARN] Cleanup failed (non-critical): {str(clean_err)}")

        # Format date as YYYY-MM-DD
        timestamp = datetime.now().strftime('%Y-%m-%d')
        full_flow_json = json.dumps(flow_json) # For Column P [NEW]
        
        rows = []
        
        # 1. Process Nodes
        for node in nodes:
            node_data = node.get('data', {})
            pos = node.get('position', {'x': 0, 'y': 0})
            row = [
                timestamp,      # A: 저장시간
                workflow_id,    # B: 워크플로우 아이디
                user_id,        # C: 사용자 아이디
                job_name,       # D: 제목
                node.get('id'), # E: 노드 ID
                node.get('type'), # F: 노드 타입
                node_data.get('label', ''), # G: 라벨
                node_data.get('team', ''),  # H: 팀
                node_data.get('person', ''),# I: 담당자
                node_data.get('method', node_data.get('applicant', '')), # J: 방법/신청자
                node_data.get('automation', '수동'), # K: 자동화
                str(node_data.get('isStar', False)), # L: 고객접점여부
                str(pos.get('x', 0)), # M: 위치 X
                str(pos.get('y', 0)), # N: 위치 Y
                "",                  # O: Target (Edges 전용)
                full_flow_json      # P: Master JSON [NEW]
            ]
            rows.append(row)

        # 2. Process Edges
        for edge in edges:
            edge_data = edge.get('data', {})
            row = [
                timestamp,      # A: 저장시간
                workflow_id,    # B: 워크플로우 아이디
                user_id,        # C: 사용자 아이디
                job_name,       # D: 제목
                edge.get('id'), # E: 엣지 ID
                "edge",         # F: 타입 고정
                edge.get('source', ''), # G: Source ID
                edge.get('target', ''), # H: Target ID
                edge_data.get('method', ''), # I: 전달수단
                edge_data.get('automation', '수동'), # J: 자동화 여부
                "", "", "", "", "", # K, L, M, N, O
                full_flow_json      # P: Master JSON [NEW]
            ]
            rows.append(row)

        if rows:
            sheet.append_rows(rows)
            return jsonify({
                "status": "success", 
                "message": f"Successfully synced {len(nodes)} nodes and {len(edges)} edges with Workflow ID {workflow_id}"
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

        # If workflowId or jobName is not provided, list all available workflows for this user
        if not request.args.get('workflowId') and not request.args.get('jobName'):
            workflows = {}
            for row in all_rows:
                # row[0]: date, row[1]: workflowId, row[2]: userId, row[3]: jobName
                if len(row) >= 4 and row[2] == user_id:
                    wf_id = row[1]
                    wf_name = row[3]
                    # We group by workflowId to ensure name changes are reflected as updates
                    if wf_id not in workflows:
                        workflows[wf_id] = {
                            "jobName": wf_name,
                            "updatedAt": row[0],
                            "workflowId": wf_id,
                            "flowData": json.dumps({"nodes": []})
                        }
                    else:
                        # Update name if there's a more recent row (though deletion logic should prevent this)
                        workflows[wf_id]["jobName"] = wf_name
            
            # Return as a list of workflows
            return jsonify({"status": "success", "data": list(workflows.values())})

        # Load specific workflow by workflowId (Primary) or jobName (Secondary)
        rows = sheet.get_all_values()
        nodes = []
        edges = []
        
        target_wf_id = request.args.get('workflowId')
        target_job_name = request.args.get('jobName')
        
        wf_data_from_json = None
        wf_id_found = None
        
        for row in rows[1:]: # Skip header
            # Match by workflowId if provided, else fall back to userId + jobName
            is_match = False
            if target_wf_id:
                is_match = (len(row) > 1 and row[1] == target_wf_id)
            elif target_job_name:
                is_match = (len(row) >= 4 and row[2] == user_id and row[3] == target_job_name)
            
            if is_match:
                wf_id_found = row[1]
                # Check for Master JSON in Column P (index 15)
                if len(row) > 15 and row[15] and not wf_data_from_json:
                    try:
                        wf_data_from_json = json.loads(row[15])
                    except:
                        pass
                
                type_val = row[5] # Column F
                
                if type_val == "edge":
                    edge = {
                        "id": row[4],
                        "type": "smoothstep",
                        "source": row[6],
                        "target": row[7],
                        "label": row[8],
                        "data": { "method": row[8], "automation": row[9] },
                        "style": { "stroke": "#3b82f6" if row[9] == "자동" else "#fbbf24" if row[9] == "반자동" else "#ef4444", "strokeWidth": 4 }
                    }
                    edges.append(edge)
                else:
                    x_val = float(row[12]) if len(row) > 12 and row[12] else 0
                    y_val = float(row[13]) if len(row) > 13 and row[13] else 0
                    is_star_val = row[11].lower() == 'true' if len(row) > 11 else False
                    
                    node = {
                        "id": row[4],
                        "type": type_val,
                        "position": {"x": x_val, "y": y_val},
                        "data": {
                            "label": row[6], "team": row[7], "person": row[8],
                            "method": row[9], "automation": row[10], "isStar": is_star_val
                        }
                    }
                    if type_val == 'node_trigger':
                        node['data']['applicant'] = row[9]
                    nodes.append(node)
        
        if nodes or wf_data_from_json:
            # If we have Master JSON data, use it for 100% visual fidelity
            final_flow_data = json.dumps(wf_data_from_json) if wf_data_from_json else json.dumps({"nodes": nodes, "edges": edges})
            
            return jsonify({
                "status": "success", 
                "data": {
                    "jobName": job_name,
                    "workflowId": wf_id_found,
                    "flowData": final_flow_data
                }
            })
        else:
            return jsonify({"status": "error", "message": "Workflow not found"}), 404
        
    except Exception as e:
        print(f"[ERROR] Load failed: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/deleteWorkflow', methods=['POST'])
def delete_workflow():
    try:
        data = request.json
        user_id = data.get('userId')
        workflow_id = data.get('workflowId')
        
        if not user_id or not workflow_id:
            return jsonify({"status": "error", "message": "UserId and WorkflowId are required"}), 400
            
        client = get_gspread_client()
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet(WORKSHEET_NAME)
        all_data = sheet.get_all_values()
        
        indices_to_delete = []
        for idx, row in enumerate(all_data):
            # Column B (index 1) is workflowId, Column C (index 2) is userId
            if len(row) > 1 and row[1] == workflow_id and row[2] == user_id:
                indices_to_delete.append(idx + 1)
        
        if not indices_to_delete:
            return jsonify({"status": "error", "message": "Workflow not found or unauthorized"}), 404
            
        # Delete in reverse to keep indices valid
        for idx in reversed(indices_to_delete):
            sheet.delete_rows(idx)
            
        return jsonify({"status": "success", "message": f"Successfully deleted {len(indices_to_delete)} rows for Workflow {workflow_id}"})
        
    except Exception as e:
        print(f"[ERROR] Delete failed: {str(e)}")
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
