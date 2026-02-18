import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = { /* ... Use your same config keys here ... */ };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const junkTable = document.getElementById('junkTable');

onValue(ref(db, 'trash'), (snapshot) => {
    const data = snapshot.val();
    junkTable.innerHTML = '';
    if (!data) {
        junkTable.innerHTML = '<p style="text-align:center; padding:20px;">Trash is empty.</p>';
        return;
    }

    Object.entries(data).forEach(([key, item]) => {
        const row = document.createElement('div');
        row.className = 'attendance-row history-grid';
        row.innerHTML = `
            <span>${item.studentName}</span>
            <span>${item.deletedAt}</span>
            <div class="log-actions">
                <button onclick="restoreItem('${key}')" title="Restore"><i class="fa-solid fa-rotate-left"></i></button>
                <button onclick="permDelete('${key}')" title="Delete Forever"><i class="fa-solid fa-circle-xmark"></i></button>
            </div>
        `;
        junkTable.appendChild(row);
    });
});

window.restoreItem = (key) => {
    onValue(ref(db, `trash/${key}`), (snapshot) => {
        const item = snapshot.val();
        // Push back to attendance logs
        item.data.forEach(log => {
            set(ref(db, `attendance/${log.key}`), log);
        });
        remove(ref(db, `trash/${key}`)); // Remove from trash
        alert("Album Restored!");
    }, { onlyOnce: true });
};

window.permDelete = (key) => {
    if (confirm("This cannot be undone. Delete forever?")) {
        remove(ref(db, `trash/${key}`));
    }
};
