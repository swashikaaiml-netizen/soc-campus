// --- NAVIGATION LOGIC ---
function setupNavigation() {
    const navItems = {
        'nav-dashboard': 'view-dashboard',
        'nav-live': 'view-live',
        'nav-reports': 'view-reports',
        'nav-settings': 'view-settings'
    };

    Object.keys(navItems).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                switchView(id, navItems[id]);
            });
        }
    });
}

// --- CONFIGURATION & SETTINGS ---
let config = {
    failed_login_limit: 3,
    large_download_threshold: 100,
    data_upload_threshold: 500
};

// ✅ FIXED: Now loads from settings.json
async function fetchSettings() {
    try {
        const response = await fetch('./settings.json');
        if (!response.ok) throw new Error("Could not load settings");
        const data = await response.json();
        config = { ...config, ...data };

        ['failed_login_limit', 'large_download_threshold', 'data_upload_threshold']
        .forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = config[id];
        });

    } catch (error) {
        console.error("Error fetching settings:", error);
    }
}

// ✅ FIXED: Demo mode (no backend)
function saveSettings() {
    const newSettings = {
        failed_login_limit: parseInt(document.getElementById('failed_login_limit').value),
        large_download_threshold: parseInt(document.getElementById('large_download_threshold').value),
        data_upload_threshold: parseInt(document.getElementById('data_upload_threshold').value)
    };

    config = { ...config, ...newSettings };
    showSettingsMessage("Settings updated (Demo Mode)", "success");
}

function showSettingsMessage(text, type) {
    const msgEl = document.getElementById('settingsMsg');
    if (!msgEl) return;

    msgEl.textContent = text;
    msgEl.style.display = 'block';
    msgEl.style.background = type === 'success'
        ? 'rgba(0, 230, 118, 0.2)'
        : 'rgba(255, 23, 68, 0.2)';
    msgEl.style.color = type === 'success'
        ? '#00e676'
        : '#ff1744';

    setTimeout(() => {
        msgEl.style.display = 'none';
    }, 3000);
}

// --- DATA FETCHING ---

async function fetchLogs() {
    try {
        const response = await fetch('./logs.json');
        if (!response.ok) throw new Error("Could not load logs");
        return await response.json();
    } catch (error) {
        console.error("Error fetching logs:", error);
        return [];
    }
}

// ✅ FIXED: Now loads from alerts.json
async function fetchAlerts() {
    try {
        const response = await fetch('./alerts.json');
        if (!response.ok) throw new Error("Could not load alerts");
        return await response.json();
    } catch (error) {
        console.error("Error fetching alerts:", error);
        return [];
    }
}

// ✅ FIXED: Now loads from report.json
async function loadReport() {
    const reportPre = document.getElementById('reportContent');
    if (!reportPre) return;

    reportPre.textContent = "Loading latest report...";

    try {
        const response = await fetch('./report.json');
        const data = await response.json();
        reportPre.textContent = data.report || "Report content unavailable.";
    } catch (error) {
        reportPre.textContent = "Failed to load report.";
        console.error("Error loading report:", error);
    }
}