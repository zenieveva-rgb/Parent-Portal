import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = { /* Your Config */ };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ... (Keep Search & Nav Logic from previous version) ...

function processData() {
    const attRef = ref(db, 'attendance');
    const logsBody = document.getElementById('attendanceTable');
    const historyBody = document.getElementById('historyTable');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        const records = Object.values(data);
        const now = Date.now();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;

        // 1. PARENT PORTAL: Show only last 12 hours
        if (logsBody) {
            logsBody.innerHTML = '';
            records.filter(r => (now - r.timestamp) < TWELVE_HOURS)
                   .sort((a,b) => b.timestamp - a.timestamp)
                   .forEach(log => {
                        const time = new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        logsBody.innerHTML += `<div class="attendance-row"><span>${log.displayName}</span><span>${log.grade}</span><span>${time}</span></div>`;
                   });
        }

        // 2. HISTORY: Group into Student Albums (No Duplicates)
        if (historyBody) {
            historyBody.classList.add('album-grid');
            historyBody.innerHTML = '';
            const albums = {};

            records.forEach(log => {
                if (!albums[log.displayName]) {
                    albums[log.displayName] = { grade: log.grade, allLogs: [] };
                }
                albums[log.displayName].allLogs.push(log.timestamp);
            });

            Object.keys(albums).forEach(name => {
                const card = document.createElement('div');
                card.className = 'student-album';
                card.innerHTML = `<div class="album-icon"><i class="fa-solid fa-folder-open"></i></div>
                                  <div class="album-name">${name}</div>
                                  <div style="font-size:10px; color:gray">${albums[name].grade}</div>`;
                
                card.onclick = () => showPopUp(name, albums[name].allLogs);
                historyBody.appendChild(card);
            });
        }
    });
}

function showPopUp(name, timestamps) {
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('individualLogs');
    document.getElementById('modalStudentName').innerText = name;
    
    list.innerHTML = '';
    timestamps.sort((a,b) => b - a).forEach(ts => {
        const d = new Date(ts);
        list.innerHTML += `<div class="attendance-row popup-grid">
            <span>${d.toLocaleDateString()}</span>
            <span style="color:var(--neon-cyan)">${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        </div>`;
    });
    
    modal.style.display = 'flex';
}

document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

processData();
