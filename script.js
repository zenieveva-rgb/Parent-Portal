import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

const panel = document.getElementById('mainPanel');
const nameInput = document.getElementById('nameInput');
const searchBtn = document.getElementById('searchBtn');
const searchBox = document.getElementById('searchBox');

// --- 1. ROTATE NAVIGATION ---
const btnToHistory = document.getElementById('navToHistory');
const btnToPortal = document.getElementById('navToPortal');

function handleNav(target) {
    panel.classList.add('rotate-effect');
    setTimeout(() => { window.location.href = target; }, 500);
}

if (btnToHistory) btnToHistory.addEventListener('click', () => handleNav('history.html'));
if (btnToPortal) btnToPortal.addEventListener('click', () => handleNav('index.html'));

// --- 2. SEARCH BOX ANIMATION ---
if (searchBtn) {
    searchBtn.addEventListener('click', () => {
        searchBox.classList.toggle('active');
        if (searchBox.classList.contains('active')) nameInput.focus();
    });
}

// --- 3. DATA PROCESSING ---
function loadRecords() {
    const attRef = ref(db, 'attendance');
    const logsBody = document.getElementById('attendanceTable');
    const historyBody = document.getElementById('historyTable');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        const records = Object.values(data);

        // Update Logs Page (index.html)
        if (logsBody) {
            logsBody.innerHTML = '';
            const query = nameInput ? nameInput.value.toLowerCase() : "";
            records.sort((a,b) => b.timestamp - a.timestamp)
                   .filter(r => r.displayName.toLowerCase().includes(query))
                   .forEach(log => {
                        const time = new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        logsBody.innerHTML += `
                            <div class="attendance-row">
                                <span>${log.displayName}</span>
                                <span style="text-align:center">${log.grade || 'N/A'}</span>
                                <span style="text-align:right; color:#00E5FF">${time}</span>
                            </div>`;
                   });
        }

        // Update History Page (history.html)
        if (historyBody) {
            historyBody.innerHTML = '';
            const summary = {};
            records.forEach(log => {
                const name = log.displayName;
                if (!summary[name]) summary[name] = { grade: log.grade, scans: 0 };
                summary[name].scans++;
            });

            Object.keys(summary).forEach(name => {
                historyBody.innerHTML += `
                    <div class="attendance-row">
                        <span>${name}</span>
                        <span style="text-align:center">${summary[name].grade || 'N/A'}</span>
                        <span style="text-align:right; color:#00E5FF">${summary[name].scans} Scans</span>
                    </div>`;
            });
        }
    });
}

if (nameInput) nameInput.addEventListener('input', loadRecords);
loadRecords();
