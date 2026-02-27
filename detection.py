import json
from collections import defaultdict
from datetime import datetime

# ==========================================
# CONFIGURATION AND THRESHOLDS
# ==========================================
# These thresholds define when an alert should be triggered

FAILED_LOGIN_THRESHOLD = 3                 # Number of failed logins before triggering a brute force alert
LARGE_DOWNLOAD_THRESHOLD_MB = 100          # File size (in megabytes) that is considered suspiciously large
SUSPICIOUS_IPS = ["103.45.67.89"]          # A mock list of known bad IP addresses
WORKING_HOURS_START = 8                    # Business hours start time (8 AM)
WORKING_HOURS_END = 18                     # Business hours end time (6 PM)

# ==========================================
# UTILITY FUNCTIONS
# ==========================================

def load_logs(file_path):
    """
    Reads the JSON file containing our security logs.
    """
    with open(file_path, 'r') as file:
        return json.load(file)

def is_outside_working_hours(timestamp_str):
    """
    Checks if a given timestamp falls outside of the normal working hours (8:00 to 18:00).
    """
    try:
        # Convert the ISO string timestamp (e.g., "2026-02-26T10:15:00Z") into a Python datetime object
        dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        hour = dt.hour
        
        # Return True if the hour is before 8 AM or from 6 PM onwards
        return hour < WORKING_HOURS_START or hour >= WORKING_HOURS_END
    except ValueError:
        return False

# ==========================================
# MAIN LOGIC: THREAT DETECTION
# ==========================================

def analyze_logs(logs):
    """
    Improved threat detection logic.
    - Tracks brute force per (IP + user)
    - Detects large data downloads
    - Detects large external data uploads (exfiltration)
    - Flags suspicious external IP activity
    """

    failed_logins = defaultdict(int)
    incidents = []

    for log in logs:
        event_type = log.get("event_type")
        ip = log.get("ip_address")
        user = log.get("user_id")
        timestamp = log.get("timestamp")

        # ---------------------------------------------------------
        # 1. Detect Suspicious External IP Activity (High)
        # ---------------------------------------------------------
        if ip and not ip.startswith("192.168."):
            incidents.append({
                "timestamp": timestamp,
                "severity": "High",
                "type": "External IP Activity",
                "description": f"Login or activity detected from external IP {ip} by user {user}."
            })

        # ---------------------------------------------------------
        # 2. Detect Brute Force Attacks (Critical)
        #    Track per (IP + user)
        # ---------------------------------------------------------
        if event_type == "login_attempt":
            key = (ip, user)

            if log.get("status") == "failed":
                failed_logins[key] += 1

                if failed_logins[key] >= FAILED_LOGIN_THRESHOLD:
                    incidents.append({
                        "timestamp": timestamp,
                        "severity": "Critical",
                        "type": "Brute Force Attack",
                        "description": f"{failed_logins[key]} failed login attempts from {ip} targeting {user}."
                    })

            elif log.get("status") == "success":
                failed_logins[key] = 0

        # ---------------------------------------------------------
        # 3. Detect Large Data Download (High / Critical)
        # ---------------------------------------------------------
        if event_type == "data_download":
            size = log.get("size_mb", 0)
            resource = log.get("resource")

            if size > LARGE_DOWNLOAD_THRESHOLD_MB:
                severity = "Critical" if size > LARGE_DOWNLOAD_THRESHOLD_MB * 2 else "High"

                incidents.append({
                    "timestamp": timestamp,
                    "severity": severity,
                    "type": "Data Exfiltration",
                    "description": f"{size}MB downloaded ({resource}) by {user}."
                })

        # ---------------------------------------------------------
        # 4. Detect Large External Data Upload (Critical)
        # ---------------------------------------------------------
        if event_type == "data_upload":
            size = log.get("size_mb", 0)
            destination_ip = log.get("destination_ip")

            if destination_ip and not destination_ip.startswith("192.168."):
                if size > LARGE_DOWNLOAD_THRESHOLD_MB:
                    incidents.append({
                        "timestamp": timestamp,
                        "severity": "Critical",
                        "type": "External Data Upload",
                        "description": f"{size}MB uploaded to external host {destination_ip} by {user}."
                    })

    return incidents
        
# ==========================================
# AUTOMATED INCIDENT REPORT GENERATION
# ==========================================

def generate_report(incidents, report_path="incident_report.txt"):
    """
    Creates a neatly formatted text file summarizing all detected security threats.
    """
    # Define a custom sorting order so that Critical incidents show up at the top
    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    
    # Sort the incidents list using our defined order
    incidents.sort(key=lambda x: severity_order.get(x["severity"], 4))

    # Open (or create) the incident_report.txt file in "write" mode
    with open(report_path, 'w') as file:
        file.write("="*50 + "\n")
        file.write("      CAMPUS SECURITY INCIDENT REPORT\n")
        file.write("="*50 + "\n")
        file.write(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        file.write(f"Total Incidents Detected: {len(incidents)}\n")
        file.write("="*50 + "\n\n")

        # Handle the case where the system was fully secure
        if len(incidents) == 0:
            file.write("No security incidents detected during the reporting period.\n")
            return

        current_severity = None
        
        # Go through our sorted list of incidents and write them to the file
        for incident in incidents:
            # Whenever the severity level changes, print a new header
            if incident["severity"] != current_severity:
                current_severity = incident["severity"]
                file.write(f"\n--- {current_severity.upper()} SEVERITY INCIDENTS ---\n")
            
            # Print the actual incident detail
            file.write(f"[{incident['timestamp']}] {incident['type']}\n")
            file.write(f"Details: {incident['description']}\n")
            file.write("-" * 30 + "\n")
            
    print(f"\nReport automatically generated at: {report_path}")

# ==========================================
# MAIN EXECUTION BLOCK
# ==========================================
# This block ensures the code below only runs if the script is executed directly

def run_analysis():
    """
    Convenience function to run the full analysis and generate a report.
    Used by the Flask backend to refresh data dynamically.
    """
    logs = load_logs("logs.json")
    incidents = analyze_logs(logs)
    generate_report(incidents)
    return incidents

if __name__ == "__main__":
    try:
        print("Analyzing security logs...")
        run_analysis()
    except FileNotFoundError:
        print("Error: logs.json file not found. Ensure it is in the same directory.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
