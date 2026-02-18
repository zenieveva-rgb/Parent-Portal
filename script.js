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

const panel = document.getElementById('panel');
const nameInput = document.getElementById('nameInput');

// --- NAVIGATION LOGIC WITH ROTATION ---
const navBtn = document.getElementById('navToHistory') || document.getElementById('navToPortal');
if (navBtn) {
    navBtn.addEventListener('click', () => {
        panel.classList.add('rotate-out');
        const target = navBtn.id === 'navToHistory' ? 'history.html' : 'index.html';
        setTimeout(() => { window.location.href = target; }, 500);
    });
}

// --- DATA FETCHING & COUNTING ---
function loadData() {
    const attRef = ref(db, 'attendance');
    const logsTable = document.getElementById('attendanceTable');
    const historyTable = document.getElementById('historyTable');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        const records = Object.values(data);

        // PAGE 1: RECENT LOGS (index.html)
        if (logsTable) {
            logsTable.innerHTML = '';
            const query = nameInput ? nameInput.value.toLowerCase() : "";
            records.sort((a,b) => b.timestamp - a.timestamp)
                .filter(r => r.displayName.toLowerCase().includes(query))
                .forEach(log => {
                    const time = new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                    logsTable.innerHTML += `
                        <div class="attendance-row">
                            <span class="col-name">${log.displayName}</span>
                            <span class="col-grade">${log.grade || 'N/A'}</span>
                            <span class="col-time">${time}</span>
                        </div>`;
                });
        }

        // PAGE 2: HISTORY TOTALS (history.html)
        if (historyTable) {
            historyTable.innerHTML = '';
            const counts = {};
            records.forEach(log => {
                const key = log.displayName;
                if (!counts[key]) counts[key] = { grade: log.grade, total: 0 };
                counts[key].total++;
            });

            Object.keys(counts).forEach(name => {
                historyTable.innerHTML += `
                    <div class="attendance-row history-grid">
                        <span class="col-name">${name}</span>
                        <span class="col-grade">${counts[name].grade || 'N/A'}</span>
                        <span class="col-scans">${counts[name].total} Scans</span>
                    </div>`;
            });
        }
    });
}

if (nameInput) nameInput.addEventListener('input', loadData);
loadData();
