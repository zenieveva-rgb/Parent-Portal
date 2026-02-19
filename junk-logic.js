import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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
const junkTable = document.getElementById('junkTable');

onValue(ref(db, 'trash'), (snapshot) => {
    const data = snapshot.val();
    junkTable.innerHTML = '';
    if (!data) {
        junkTable.innerHTML = '<p style="text-align:center; padding:20px; opacity:0.5;">Trash is empty.</p>';
        return;
    }

    Object.entries(data).forEach(([key, item]) => {
        const row = document.createElement('div');
        row.className = 'attendance-row history-grid';
        row.innerHTML = `
            <span>${item.studentName}</span>
            <span>${item.deletedAt}</span>
            <div class="log-actions" style="display:flex; gap:10px;">
                <button onclick="restoreItem('${key}')" class="action-btn" style="color:#00ff88; background:none; border:none; cursor:pointer;"><i class="fa-solid fa-rotate-left"></i></button>
                <button onclick="permDelete('${key}')" class="action-btn" style="color:#ff4d4d; background:none; border:none; cursor:pointer;"><i class="fa-solid fa-circle-xmark"></i></button>
            </div>
        `;
        junkTable.appendChild(row);
    });
});

window.restoreItem = (trashKey) => {
    onValue(ref(db, `trash/${trashKey}`), async (snapshot) => {
        const entry = snapshot.val();
        if (!entry) return;

        const updates = {};
        entry.logs.forEach(log => {
            const originalKey = log.originalKey;
            const logData = { ...log };
            delete logData.originalKey; 
            updates[`attendance/${originalKey}`] = logData;
        });

        updates[`trash/${trashKey}`] = null;
        await update(ref(db), updates);
        alert("Student data restored!");
    }, { onlyOnce: true });
};

window.permDelete = (key) => {
    if (confirm("Delete forever?")) remove(ref(db, `trash/${key}`));
};

document.getElementById('emptyTrashBtn')?.addEventListener('click', () => {
    if (confirm("Clear entire trash bin?")) remove(ref(db, 'trash'));
});
