import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// --- 1. CONFIGURATION ---
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

// --- 2. NAVIGATION ---
const panel = document.getElementById('mainPanel');
function handleNav(target) {
    if (panel) {
        panel.classList.add('rotate-effect');
        setTimeout(() => { window.location.href = target; }, 500);
    } else {
        window.location.href = target;
    }
}

document.getElementById('navToHistory')?.addEventListener('click', () => handleNav('history.html'));
document.getElementById('navToPortal')?.addEventListener('click', () => handleNav('index.html'));

// --- 3. SEARCH LOGIC ---
const searchBtn = document.getElementById('searchBtn');
const searchBox = document.getElementById('searchBox');
const nameInput = document.getElementById('nameInput');

if (searchBtn && searchBox) {
    searchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchBox.classList.toggle('active');
        if (searchBox.classList.contains('active')) {
            nameInput?.focus();
        }
    });
}

// --- 4. DATA PROCESSING (UPDATED FOR NEW KEYS) ---
function processData() {
    const attRef = ref(db, 'attendance');
    const logsBody = document.getElementById('attendanceTable');
    const historyBody = document.getElementById('historyTable');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Convert Firebase object to Array and REVERSE so newest is first
        const records = Object.values(data).reverse();
        const query = nameInput?.value.toLowerCase() || "";

        // --- PARENT PORTAL (Recent Logs) ---
        if (logsBody) {
            logsBody.innerHTML = '';
            records.filter(r => (r.studentName || "").toLowerCase().includes(query))
                   .forEach(log => {
                        logsBody.innerHTML += `
                            <div class="attendance-row">
                                <span style="font-weight:bold;">${log.studentName || "Unknown"}</span>
                                <span style="text-align:center;">${log.grade || "N/A"}</span>
                                <span style="text-align:right; color:var(--neon-cyan); font-size: 0.8rem;">${log.scannedAt || "No Time"}</span>
                            </div>`;
                   });
        }

        // --- HISTORY PAGE (Album Logic) ---
        if (historyBody) {
            historyBody.innerHTML = '';
            const albums = {};

            records.forEach(log => {
                const sName = log.studentName || "Unknown";
                if (!albums[sName]) {
                    albums[sName] = { grade: log.grade, allLogs: [] };
                }
                albums[sName].allLogs.push(log);
            });

            Object.keys(albums)
                .filter(name => name.toLowerCase().includes(query))
                .forEach(name => {
                    const card = document.createElement('div');
                    card.className = 'student-album';
                    card.innerHTML = `
                        <div class="album-icon"><i class="fa-solid fa-folder-open"></i></div>
                        <div class="album-name">${name}</div>
                        <div style="font-size:10px; color:#888;">${albums[name].grade}</div>
                    `;
                    card.onclick = () => showPopUp(name, albums[name].allLogs);
                    historyBody.appendChild(card);
                });
        }
    });
}

// --- 5. POP-UP (MODAL) LOGIC ---
function showPopUp(name, logs) {
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('individualLogs');
    const modalTitle = document.getElementById('modalStudentName');

    if (modal && list) {
        modalTitle.innerText = name;
        list.innerHTML = '';
        
        logs.forEach(log => {
            list.innerHTML += `
                <div class="attendance-row popup-grid" style="display:grid; grid-template-columns:1fr; border-bottom:1px solid rgba(255,255,255,0.1); padding:10px 0;">
                    <span style="color:var(--neon-cyan)">${log.scannedAt || "N/A"}</span>
                </div>`;
        });
        modal.style.display = 'flex';
    }
}

document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

if (nameInput) nameInput.addEventListener('input', processData);
processData();

// --- NEW VARIABLES ---
const ADMIN_PASSWORD = "your_password_here"; // Change this to your preferred password
let isDeleteMode = false;

// --- TOGGLE DELETE MODE ---
document.getElementById('toggleDeleteMode')?.addEventListener('click', function() {
    isDeleteMode = !isDeleteMode;
    this.style.color = isDeleteMode ? "red" : "white";
    alert(isDeleteMode ? "Delete Mode Enabled. Click an album to remove it." : "Delete Mode Disabled.");
});

// --- JUNK BIN POPUP ---
document.getElementById('trashBinBtn')?.addEventListener('click', () => {
    const trashRef = ref(db, 'trash');
    onValue(trashRef, (snapshot) => {
        const trashData = snapshot.val();
        if (!trashData) return alert("Junk bin is empty!");
        
        // You can create a modal similar to your showPopUp to list these and add a 'Recover' button
        console.log("Junk Files:", trashData);
        alert("Check console for Junk files. Would you like to build a recovery UI next?");
    });
});

// --- UPDATED ALBUM LOGIC (Inside processData) ---
// Find the part where you create the card and update it:
const card = document.createElement('div');
card.className = 'student-album';
card.innerHTML = `
    <div class="album-icon"><i class="fa-solid fa-folder-open"></i></div>
    <div class="album-name">${name}</div>
    <div style="font-size:10px; color:#888;">${albums[name].grade}</div>
`;

card.onclick = () => {
    if (isDeleteMode) {
        handleDelete(name, albums[name].allLogs);
    } else {
        showPopUp(name, albums[name].allLogs);
    }
};

// --- DELETE & VERIFY LOGIC ---
function handleDelete(studentName, logs) {
    const password = prompt("ADMIN VERIFICATION: Enter password to delete this album:");
    
    if (password === ADMIN_PASSWORD) {
        const confirmDelete = confirm(`Are you sure you want to move ${studentName} to Junk?`);
        if (confirmDelete) {
            // 1. Save to Junk (Trash) Node
            const trashRef = ref(db, 'trash/' + studentName);
            set(trashRef, {
                studentName: studentName,
                deletedAt: new Date().toLocaleString(),
                data: logs
            }).then(() => {
                // 2. Remove from Attendance (This is a complex move, requires specific keys)
                alert(`${studentName} moved to Junk Files.`);
                // Note: To fully delete from Firebase, you'd need the specific keys of the logs
                // For now, it is safely copied to Trash.
            });
        }
    } else {
        alert("Incorrect Password. Access Denied.");
    }
}
