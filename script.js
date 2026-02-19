import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

const ADMIN_PASSWORD = "1234"; 
let isSelectionMode = false;
let selectedAlbums = new Set();
let fullDataBuffer = {}; 

function smoothNavigate(url) {
    const panel = document.getElementById('mainPanel');
    if (panel) {
        panel.style.opacity = "0";
        panel.style.transform = "scale(0.9)";
    }
    setTimeout(() => { window.location.href = url; }, 500);
}

document.getElementById('navToHistory')?.addEventListener('click', () => smoothNavigate('history.html'));
document.getElementById('trashBinBtn')?.addEventListener('click', () => smoothNavigate('junk.html'));
document.getElementById('navToPortal')?.addEventListener('click', () => smoothNavigate('index.html'));

const searchBox = document.getElementById('searchBox');
const searchTrigger = document.querySelector('.search-trigger');
searchTrigger?.addEventListener('click', () => {
    searchBox.classList.toggle('active');
    if (searchBox.classList.contains('active')) document.getElementById('nameInput').focus();
});

document.getElementById('nameInput')?.addEventListener('input', (e) => processData(e.target.value.toLowerCase()));

const eraserBtn = document.getElementById('toggleDeleteMode');
eraserBtn?.addEventListener('click', async () => {
    if (isSelectionMode && selectedAlbums.size > 0) {
        const pass = prompt(`Move ${selectedAlbums.size} items to Junk? Password:`);
        if (pass === ADMIN_PASSWORD) {
            const updates = {};
            for (let name of selectedAlbums) {
                const logsEntries = Object.entries(fullDataBuffer).filter(([k, v]) => v.studentName === name);
                if (logsEntries.length > 0) {
                    const trashId = `trash_${Date.now()}_${name.replace(/\s+/g, '_')}`;
                    updates[`trash/${trashId}`] = {
                        studentName: name,
                        deletedAt: new Date().toLocaleString(),
                        logs: logsEntries.map(([key, val]) => ({ ...val, originalKey: key }))
                    };
                    logsEntries.forEach(([key]) => { updates[`attendance/${key}`] = null; });
                }
            }
            try {
                await update(ref(db), updates);
                alert("Moved to Junk.");
                selectedAlbums.clear();
                isSelectionMode = false;
                eraserBtn.classList.remove('active');
            } catch (e) { alert("Error updating database."); }
        } else if (pass !== null) alert("Wrong Password.");
    } else {
        isSelectionMode = !isSelectionMode;
        if (!isSelectionMode) selectedAlbums.clear();
        eraserBtn?.classList.toggle('active', isSelectionMode);
        processData();
    }
});

function processData(searchTerm = "") {
    onValue(ref(db, 'attendance'), (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        const portalTable = document.getElementById('attendanceTable'); 
        const historyTable = document.getElementById('historyTable');   
        
        if (portalTable) {
            portalTable.innerHTML = '';
            Object.entries(fullDataBuffer).filter(([k, v]) => v.studentName?.toLowerCase().includes(searchTerm))
                .reverse().forEach(([key, val]) => {
                    const row = document.createElement('div');
                    row.className = 'attendance-row';
                    row.innerHTML = `<span>${val.studentName}</span><span class="text-center">${val.grade || 'N/A'}</span><span class="text-right">${val.time || val.scannedAt || '--:--'}</span>`;
                    portalTable.appendChild(row);
                });
        }

        if (historyTable) {
            historyTable.innerHTML = '';
            const albums = {};
            Object.entries(fullDataBuffer).forEach(([key, val]) => {
                const sName = val.studentName || "Unknown";
                if (!albums[sName]) albums[sName] = { grade: val.grade, logs: [] };
                albums[sName].logs.push({ key, ...val });
            });
            Object.keys(albums).filter(n => n.toLowerCase().includes(searchTerm)).forEach(name => {
                const wrapper = document.createElement('div');
                wrapper.className = 'album-row-wrapper';
                const checkboxHTML = isSelectionMode ? `<input type="checkbox" class="album-checkbox" onchange="toggleSelect('${name}')" ${selectedAlbums.has(name) ? 'checked' : ''}>` : '';
                wrapper.innerHTML = `${checkboxHTML}<div class="student-album"><div class="album-icon"><i class="fa-solid fa-folder"></i></div><div class="album-name">${name}</div><div class="total-scans">${albums[name].logs.length} Scans</div></div>`;
                wrapper.querySelector('.student-album').onclick = () => { if (!isSelectionMode) showPopUp(name, albums[name].logs); };
                historyTable.appendChild(wrapper);
            });
        }
    });
}

window.toggleSelect = (name) => {
    if (selectedAlbums.has(name)) selectedAlbums.delete(name);
    else selectedAlbums.add(name);
};

window.showPopUp = (name, logs) => {
    document.getElementById('modalStudentName').innerText = name;
    const list = document.getElementById('individualLogs');
    list.innerHTML = '';
    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'attendance-row popup-grid';
        item.innerHTML = `<span>${log.scannedAt || log.time}</span><button onclick="deleteLogEntry('${log.key}')" style="background:none; border:none; color:white; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>`;
        list.appendChild(item);
    });
    document.getElementById('historyModal').style.display = 'flex';
};

window.deleteLogEntry = (key) => { if (prompt("Admin Password:") === ADMIN_PASSWORD) remove(ref(db, `attendance/${key}`)); };
document.getElementById('closeModal')?.addEventListener('click', () => { document.getElementById('historyModal').style.display = 'none'; });

processData();
