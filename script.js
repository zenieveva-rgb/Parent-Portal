import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// --- STEP 1: CONFIGURATION ---
// Replace the block below with your ACTUAL Firebase keys from your project
const firebaseConfig = {
    apiKey: "AIzaSyBdlEvDlQ1qWr8xdL4bV25NW4RgcTajYqM",
    authDomain: "database-98a70.firebaseapp.com",
    databaseURL: "https://database-98a70-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "database-98a70",
    storageBucket: "database-98a70.firebasestorage.app",
    messagingSenderId: "460345885965",
    appId: "1:460345885965:web:8484da766b979a0eaf9c44"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- STEP 2: DOM ELEMENTS ---
const panel = document.getElementById('mainPanel');
const nameInput = document.getElementById('nameInput');
const searchBtn = document.getElementById('searchBtn');
const searchBox = document.getElementById('searchBox');

// --- STEP 3: NAVIGATION & ROTATE ANIMATION ---
const handleNav = (target) => {
    if (panel) {
        panel.classList.add('rotate-effect');
        // Delay navigation so user sees the rotation
        setTimeout(() => { 
            window.location.href = target; 
        }, 550);
    } else {
        window.location.href = target;
    }
};

document.getElementById('navToHistory')?.addEventListener('click', () => handleNav('history.html'));
document.getElementById('navToPortal')?.addEventListener('click', () => handleNav('index.html'));

// --- STEP 4: SEARCH ICON & INPUT ANIMATION ---
if (searchBtn && searchBox) {
    searchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchBox.classList.toggle('active');
        if (searchBox.classList.contains('active')) {
            nameInput?.focus();
        }
    });

    // Mobile improvement: Close search if clicking elsewhere and input is empty
    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target) && nameInput?.value === "") {
            searchBox.classList.remove('active');
        }
    });
}

// --- STEP 5: 12-HOUR LOGIC & DATA RENDERING ---
function processData() {
    const attRef = ref(db, 'attendance');
    const logsBody = document.getElementById('attendanceTable');
    const historyBody = document.getElementById('historyTable');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            if (logsBody) logsBody.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">No recent logs.</p>';
            return;
        }

        const now = Date.now();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        const records = Object.values(data);

        // --- PAGE: RECENT LOGS (index.html) ---
        if (logsBody) {
            logsBody.innerHTML = '';
            const query = nameInput?.value.toLowerCase() || "";
            
            records
                .filter(r => (now - r.timestamp) < TWELVE_HOURS) // Only last 12 hours
                .filter(r => r.displayName.toLowerCase().includes(query))
                .sort((a,b) => b.timestamp - a.timestamp)
                .forEach(log => {
                    const time = new Date(log.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                    
                    logsBody.innerHTML += `
                        <div class="attendance-row">
                            <span style="font-weight:600; text-transform:uppercase;">${log.displayName}</span>
                            <span style="text-align:center; color:#888;">${log.grade || 'N/A'}</span>
                            <span style="text-align:right; color:var(--neon-cyan); font-family:monospace;">${time}</span>
                        </div>`;
                });
        }

        // --- PAGE: HISTORY ARCHIVE (history.html) ---
        if (historyBody) {
            historyBody.innerHTML = '';
            const summary = {};
            
            // Group and Count Scans
            records.forEach(log => {
                const name = log.displayName;
                if (!summary[name]) {
                    summary[name] = { grade: log.grade, total: 0 };
                }
                summary[name].total++;
            });

            // Render History
            Object.keys(summary).forEach(name => {
                historyBody.innerHTML += `
                    <div class="attendance-row">
                        <span style="font-weight:600; text-transform:uppercase;">${name}</span>
                        <span style="text-align:center; color:#888;">${summary[name].grade || 'N/A'}</span>
                        <span style="text-align:right; color:var(--neon-gold); font-weight:bold;">${summary[name].total} Scans</span>
                    </div>`;
            });
        }
    });
}

// Event listener for live search filtering
if (nameInput) {
    nameInput.addEventListener('input', processData);
}

// Initial Run
processData();
