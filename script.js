import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    onValue, 
    off, 
    remove, 
    update, 
    get,
    push,
    set
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import {
    getAuth,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

// ==================== FIREBASE CONFIG ====================
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
const auth = getAuth(app);

// ==================== SECURITY CONFIGURATION ====================
const SECURITY = {
    ADMIN_EMAIL: "depeddcp11@gmail.com",
    PASSWORD_HASH_PATH: "systemConfig/adminPasswordHash",
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MAX_ATTEMPTS: 3,
    LOCKOUT_TIME: 5 * 60 * 1000 // 5 minutes
};

// ==================== GLOBAL STATE ====================
const state = {
    attendanceData: {},
    currentSearch: "",
    unsubscribeAttendance: null,
    isAuthenticated: false,
    authExpiry: null,
    failedAttempts: 0,
    lockoutUntil: null,
    pendingDelete: null, // Stores {type, key, callback}
    bcryptLoaded: false
};

// ==================== LOAD BCRYPT ====================
async function loadBcrypt() {
    if (state.bcryptLoaded) return true;
    
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/bcryptjs/2.4.3/bcrypt.min.js";
        script.onload = () => {
            state.bcryptLoaded = true;
            resolve(true);
        };
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}

// ==================== INITIALIZE SECURITY ====================
async function initializeSecurity() {
    await loadBcrypt();
    
    // Check if password hash exists, if not create default
    const hashRef = ref(db, SECURITY.PASSWORD_HASH_PATH);
    const snapshot = await get(hashRef);
    
    if (!snapshot.exists()) {
        // Create default password "Admin123!" hashed
        const defaultHash = await hashPassword("Admin123!");
        await set(hashRef, {
            hash: defaultHash,
            createdAt: new Date().toISOString(),
            mustChange: true
        });
        console.log("Default password created: Admin123!");
        showToast("Default password: Admin123! - Please change immediately!", "warning", 10000);
    }
    
    setupAuthListener();
}

// ==================== PASSWORD HASHING ====================
async function hashPassword(password) {
    if (!window.dcodeIO?.bcrypt) await loadBcrypt();
    const bcrypt = window.dcodeIO.bcrypt;
    const salt = await bcrypt.genSalt(10); // 10 rounds = secure but not too slow
    return await bcrypt.hash(password, salt);
}

async function verifyPassword(password, hash) {
    if (!window.dcodeIO?.bcrypt) await loadBcrypt();
    const bcrypt = window.dcodeIO.bcrypt;
    return await bcrypt.compare(password, hash);
}

// ==================== AUTHENTICATION LISTENER ====================
function setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
        if (user && user.email === SECURITY.ADMIN_EMAIL) {
            state.isAuthenticated = true;
            state.authExpiry = Date.now() + SECURITY.SESSION_TIMEOUT;
            console.log("Admin authenticated");
        } else {
            state.isAuthenticated = false;
        }
    });
}

// ==================== SECURITY MODAL FUNCTIONS ====================
function showPasswordModal(deleteAction) {
    // Check lockout
    if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
        const remaining = Math.ceil((state.lockoutUntil - Date.now()) / 1000);
        showToast(`Too many attempts. Try again in ${remaining}s`, "error");
        return;
    }

    const modal = document.getElementById('passwordModal');
    const input = document.getElementById('securityPassword');
    const error = document.getElementById('passwordError');
    const confirmBtn = document.getElementById('confirmPassword');
    const cancelBtn = document.getElementById('cancelPassword');
    const forgotLink = document.getElementById('forgotPassword');
    const toggleBtn = document.getElementById('togglePassword');
    
    state.pendingDelete = deleteAction;
    error.textContent = '';
    input.value = '';
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    input.focus();
    
    // Toggle password visibility
    toggleBtn.onclick = () => {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        toggleBtn.innerHTML = `<i class="fa-solid fa-eye${type === 'password' ? '' : '-slash'}"></i>`;
    };
    
    // Confirm button
    confirmBtn.onclick = async () => {
        const password = input.value;
        if (!password) {
            error.textContent = 'Please enter password';
            return;
        }
        
        await verifyAndProceed(password);
    };
    
    // Cancel button
    cancelBtn.onclick = closePasswordModal;
    
    // Forgot password
    forgotLink.onclick = (e) => {
        e.preventDefault();
        closePasswordModal();
        showResetModal();
    };
    
    // Enter key
    input.onkeypress = (e) => {
        if (e.key === 'Enter') confirmBtn.click();
    };
}

function closePasswordModal() {
    const modal = document.getElementById('passwordModal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        state.pendingDelete = null;
    }, 300);
}

function showResetModal() {
    const modal = document.getElementById('resetModal');
    const sendBtn = document.getElementById('sendReset');
    const cancelBtn = document.getElementById('cancelReset');
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    
    sendBtn.onclick = async () => {
        showLoading(true);
        try {
            await sendPasswordResetEmail(auth, SECURITY.ADMIN_EMAIL);
            showToast("Reset link sent to depeddcp11@gmail.com!", "success");
            closeResetModal();
        } catch (error) {
            console.error("Reset error:", error);
            showToast("Failed to send reset email. Check console.", "error");
        }
        showLoading(false);
    };
    
    cancelBtn.onclick = closeResetModal;
}

function closeResetModal() {
    const modal = document.getElementById('resetModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

function showLoading(show) {
    const loading = document.getElementById('securityLoading');
    loading.style.display = show ? 'flex' : 'none';
}

// ==================== VERIFY PASSWORD ====================
async function verifyAndProceed(password) {
    showLoading(true);
    
    try {
        // Get stored hash
        const hashRef = ref(db, SECURITY.PASSWORD_HASH_PATH);
        const snapshot = await get(hashRef);
        const storedData = snapshot.val();
        
        if (!storedData) {
            throw new Error("Security configuration not found");
        }
        
        // Verify using bcrypt
        const isValid = await verifyPassword(password, storedData.hash);
        
        if (isValid) {
            // Reset failed attempts
            state.failedAttempts = 0;
            state.lockoutUntil = null;
            
            // Set authentication session
            state.isAuthenticated = true;
            state.authExpiry = Date.now() + SECURITY.SESSION_TIMEOUT;
            
            // Sign in to Firebase Auth for additional security
            try {
                await signInWithEmailAndPassword(auth, SECURITY.ADMIN_EMAIL, password);
            } catch (authError) {
                // If user doesn't exist, create them
                if (authError.code === 'auth/user-not-found') {
                    await createUserWithEmailAndPassword(auth, SECURITY.ADMIN_EMAIL, password);
                }
            }
            
            closePasswordModal();
            
            // Execute pending delete
            if (state.pendingDelete) {
                await executeDelete(state.pendingDelete);
            }
            
            showToast("Security verification passed", "success");
        } else {
            handleFailedAttempt();
        }
    } catch (error) {
        console.error("Verification error:", error);
        showToast("Security error occurred", "error");
    }
    
    showLoading(false);
}

function handleFailedAttempt() {
    state.failedAttempts++;
    const remaining = SECURITY.MAX_ATTEMPTS - state.failedAttempts;
    
    if (state.failedAttempts >= SECURITY.MAX_ATTEMPTS) {
        state.lockoutUntil = Date.now() + SECURITY.LOCKOUT_TIME;
        document.getElementById('passwordError').textContent = 
            `Too many failed attempts. Locked for 5 minutes.`;
        showToast("Security lockout activated", "error");
    } else {
        document.getElementById('passwordError').textContent = 
            `Invalid password. ${remaining} attempts remaining.`;
        showToast(`Invalid password. ${remaining} attempts left.`, "error");
    }
}

// ==================== EXECUTE DELETE ====================
async function executeDelete(action) {
    if (!state.isAuthenticated || Date.now() > state.authExpiry) {
        showToast("Session expired. Please verify again.", "error");
        state.isAuthenticated = false;
        return;
    }
    
    try {
        switch(action.type) {
            case 'log':
                await remove(ref(db, `attendance/${action.key}`));
                showToast("Log deleted successfully", "success");
                break;
            case 'trash':
                await remove(ref(db, `trash/${action.key}`));
                showToast("Permanently deleted", "success");
                break;
            case 'restore':
                await restoreItem(action.key);
                break;
            case 'emptyTrash':
                await remove(ref(db, 'trash'));
                showToast("Trash emptied", "success");
                break;
        }
    } catch (error) {
        console.error("Delete error:", error);
        showToast("Operation failed", "error");
    }
}

// ==================== PUBLIC DELETE API ====================
window.secureDeleteLog = (key) => {
    showPasswordModal({ type: 'log', key });
};

window.securePermDelete = (key) => {
    showPasswordModal({ type: 'trash', key });
};

window.secureRestore = (key) => {
    showPasswordModal({ type: 'restore', key });
};

window.secureEmptyTrash = () => {
    if (confirm("⚠️ WARNING: This will permanently delete ALL items in trash. Continue?")) {
        if (confirm("Are you absolutely sure? This cannot be undone.")) {
            showPasswordModal({ type: 'emptyTrash' });
        }
    }
};

// ==================== CHANGE PASSWORD FUNCTION ====================
window.changeAdminPassword = async (oldPassword, newPassword) => {
    showLoading(true);
    try {
        // Verify old password
        const hashRef = ref(db, SECURITY.PASSWORD_HASH_PATH);
        const snapshot = await get(hashRef);
        const storedData = snapshot.val();
        
        const isValid = await verifyPassword(oldPassword, storedData.hash);
        if (!isValid) {
            showToast("Current password is incorrect", "error");
            showLoading(false);
            return false;
        }
        
        // Hash new password
        const newHash = await hashPassword(newPassword);
        
        // Update in database
        await set(hashRef, {
            hash: newHash,
            updatedAt: new Date().toISOString(),
            mustChange: false
        });
        
        // Update Firebase Auth password
        const user = auth.currentUser;
        if (user) {
            await updatePassword(user, newPassword);
        }
        
        showToast("Password changed successfully!", "success");
        showLoading(false);
        return true;
    } catch (error) {
        console.error("Change password error:", error);
        showToast("Failed to change password", "error");
        showLoading(false);
        return false;
    }
};

// ==================== REST OF YOUR EXISTING CODE ====================
// ... (Keep all your existing render functions, listeners, etc.) ...

// Update deleteLog to use secure version
window.deleteLog = (key) => {
    if (!confirm("Move this scan to trash?")) return;
    window.secureDeleteLog(key);
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeSecurity();
    // ... rest of your init code ...
});
