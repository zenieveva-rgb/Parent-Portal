import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = { /* USE YOUR CONFIG HERE */ };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const panel = document.getElementById('mainPanel');
const nameInput = document.getElementById('nameInput');

// 1. Navigation with Rotate Animation
const handleNav = (target) => {
    panel.classList.add('rotate-effect');
    setTimeout(() => { window.location.href = target; }, 550);
};

document.getElementById('navToHistory')?.addEventListener('click', () => handleNav('history.html'));
document.getElementById('navToPortal')?.addEventListener('click', () => handleNav('index.html'));

// 2. Search Toggle
document.getElementById('searchBtn')?.addEventListener('click', () => {
    document.getElementById('searchBox').classList.toggle('active');
    nameInput?.focus();
});

// 3. 12-Hour Logic & Data Fetching
function processData() {
    const attRef = ref(db, 'attendance');
    const logsBody = document.getElementById('attendanceTable');
    const historyBody = document.getElementById('historyTable');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const now = Date.now();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000; // 43,200,000 milliseconds

        const records = Object.values(data);

        // LOGS PAGE: Only show if scanned within last 12 hours
        if (logsBody) {
            logsBody.innerHTML = '';
            const query = nameInput?.value.toLowerCase() || "";
            
            records.filter(r => (now - r.timestamp) < TWELVE_HOURS)
                   .filter(r => r.displayName.toLowerCase().includes(query))
                   .sort((a,b) => b.timestamp - a.timestamp)
                   .forEach(log => {
                        const time = new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        logsBody.innerHTML += `
                            <div class="attendance-row">
                                <span style="font-weight:600">${log.displayName}</span>
                                <span style="text-align:center; color:#888">${log.grade || 'N/A'}</span>
                                <span style="text-align:right; color:var(--neon-cyan)">${time}</span>
                            </div>`;
                   });
        }

        // HISTORY PAGE: Show ALL time summary (Total Counts)
        if (historyBody) {
            historyBody.innerHTML = '';
            const summary = {};
            records.forEach(log => {
                const name = log.displayName;
                if (!summary[name]) summary[name] = { grade: log.grade, total: 0 };
                summary[name].total++;
            });

            Object.keys(summary).forEach(name => {
                historyBody.innerHTML += `
                    <div class="attendance-row">
                        <span style="font-weight:600">${name}</span>
                        <span style="text-align:center; color:#888">${summary[name].grade || 'N/A'}</span>
                        <span style="text-align:right; color:var(--neon-gold)">${summary[name].total} Scans</span>
                    </div>`;
            });
        }
    });
}

if (nameInput) nameInput.addEventListener('input', processData);
processData();
