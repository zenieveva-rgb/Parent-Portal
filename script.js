import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// Firebase Config
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

// Event Listener para sa Button
document.getElementById('searchBtn').addEventListener('click', () => {
    const lrn = document.getElementById('lrnInput').value.trim();
    const resultsDiv = document.getElementById('results');
    
    if (!lrn) {
        alert("Please enter an LRN");
        return;
    }

    resultsDiv.innerHTML = '<p style="opacity:0.5;">Searching...</p>';

    const attendanceRef = ref(db, 'attendance');
    const lrnQuery = query(attendanceRef, orderByChild('lrn'), equalTo(lrn));

    onValue(lrnQuery, (snapshot) => {
        const data = snapshot.val();
        resultsDiv.innerHTML = '';

        if (data) {
            const logs = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
            resultsDiv.innerHTML = `<p style="font-weight:bold; margin-top:20px;">Student: ${logs[0].displayName}</p>`;
            
            logs.forEach(log => {
                const date = new Date(log.timestamp).toLocaleString();
                resultsDiv.innerHTML += `
                    <div class="log-item">
                        <span class="status">● PRESENT</span><br>
                        <span>${date}</span>
                    </div>
                `;
            });
        } else {
            resultsDiv.innerHTML = '<p style="color:#ff4d4d; margin-top:20px;">No record found.</p>';
        }
    });
});
