// DOM Elements
const saveBtn = document.getElementById('saveBtn');
const groupInput = document.getElementById('group');
const keyInput = document.getElementById('key');
const valueInput = document.getElementById('value');
const outputEl = document.getElementById('output');
const searchInput = document.getElementById('searchInput');
const filterChips = document.getElementById('filterChips');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const generatePasswordBtn = document.getElementById('generatePasswordBtn');
const passwordModal = document.getElementById('passwordModal');
const closeModal = document.querySelector('.close');
const usePasswordBtn = document.getElementById('usePasswordBtn');
const passwordLength = document.getElementById('passwordLength');
const lengthValue = document.getElementById('lengthValue');
const includeUpper = document.getElementById('includeUpper');
const includeLower = document.getElementById('includeLower');
const includeNumbers = document.getElementById('includeNumbers');
const includeSymbols = document.getElementById('includeSymbols');
const generatedPassword = document.getElementById('generatedPassword');
const copyPasswordBtn = document.getElementById('copyPasswordBtn');
const refreshPasswordBtn = document.getElementById('refreshPasswordBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const clearAllBtn = document.getElementById('clearAllBtn');
const groupList = document.getElementById('groupList');

// App State
let currentFilter = 'all';
let currentSearch = '';
let isPasswordVisible = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayData();
    updateGroupDatalist();
});

// Event Listeners
saveBtn.addEventListener('click', saveData);
searchInput.addEventListener('input', handleSearch);
togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
generatePasswordBtn.addEventListener('click', openPasswordGenerator);
closeModal.addEventListener('click', closePasswordGenerator);
usePasswordBtn.addEventListener('click', useGeneratedPassword);
passwordLength.addEventListener('input', updatePasswordLengthValue);
refreshPasswordBtn.addEventListener('click', generateNewPassword);
copyPasswordBtn.addEventListener('click', copyGeneratedPassword);
exportBtn.addEventListener('click', exportData);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', importData);
clearAllBtn.addEventListener('click', confirmClearAllData);

// Functions
function saveData() {
    const group = groupInput.value.trim();
    const key = keyInput.value.trim();
    const value = valueInput.value;

    if (!group || !key) {
        showToast('Group and Key are required!', 'error');
        return;
    }

    chrome.storage.local.get([group], (result) => {
        const groupData = result[group] || {};
        const isNewKey = !groupData[key];
        groupData[key] = value;

        chrome.storage.local.set({ [group]: groupData }, () => {
            if (isNewKey) {
                showToast(`'${key}' has been added to '${group}'`);
            } else {
                showToast(`'${key}' has been updated in '${group}'`);
            }
            loadAndDisplayData();
            updateGroupDatalist();

            // Clear inputs if it's a new entry
            if (isNewKey) {
                keyInput.value = '';
                valueInput.value = '';
                keyInput.focus();
            }
        });
    });
}

function loadAndDisplayData() {
    chrome.storage.local.get(null, (allGroups) => {
        // Update filter chips
        updateFilterChips(Object.keys(allGroups));

        // Filter data based on current filter and search
        let filteredGroups = {};

        if (currentFilter === 'all') {
            filteredGroups = allGroups;
        } else {
            if (allGroups[currentFilter]) {
                filteredGroups[currentFilter] = allGroups[currentFilter];
            }
        }

        // Apply search filter
        if (currentSearch) {
            const searchLower = currentSearch.toLowerCase();
            const searchResults = {};

            Object.entries(filteredGroups).forEach(([group, items]) => {
                const filteredItems = {};
                Object.entries(items).forEach(([key, value]) => {
                    if (
                        key.toLowerCase().includes(searchLower) ||
                        value.toLowerCase().includes(searchLower)
                    ) {
                        filteredItems[key] = value;
                    }
                });

                if (Object.keys(filteredItems).length > 0) {
                    searchResults[group] = filteredItems;
                }
            });

            filteredGroups = searchResults;
        }

        displayData(filteredGroups);
    });
}

function displayData(groups) {
    outputEl.innerHTML = '';

    if (Object.keys(groups).length === 0) {
        outputEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-folder-open"></i>
        <p>No data found. Add your first entry!</p>
      </div>
    `;
        return;
    }

    for (const [group, items] of Object.entries(groups)) {
        if (Object.keys(items).length === 0) continue;

        const groupEl = document.createElement('div');
        groupEl.className = 'group-container';

        groupEl.innerHTML = `
      <div class="group-header">
        <div class="group-title">
          <i class="fas fa-folder"></i>
          ${group}
        </div>
        <div class="group-actions">
          <button class="delete-group-btn" title="Delete Group" data-group="${group}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="item-list">
        ${Object.entries(items).map(([key, value]) => `
          <div class="item">
            <div class="item-info">
              <div class="item-key">${key}</div>
              <div class="item-value ${isSensitiveKey(key) ? 'masked' : ''}">${maskSensitiveValue(key, value)}</div>
            </div>
            <div class="item-actions">
              <button class="copy-btn" title="Copy Value" data-value="${value}">
                <i class="fas fa-copy"></i>
              </button>
              <button class="reveal-btn" title="Toggle Visibility" data-key="${key}" data-value="${value}">
                <i class="fas fa-eye"></i>
              </button>
              <button class="edit-btn" title="Edit" data-group="${group}" data-key="${key}" data-value="${value}">
                <i class="fas fa-pencil-alt"></i>
              </button>
              <button class="delete-btn" title="Delete" data-group="${group}" data-key="${key}">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

        outputEl.appendChild(groupEl);
    }

    // Add event listeners to action buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.value)
                .then(() => showToast('Copied to clipboard!'));
        });
    });

    document.querySelectorAll('.reveal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const valueEl = e.target.closest('.item').querySelector('.item-value');
            const isRevealed = valueEl.getAttribute('data-revealed') === 'true';

            if (isRevealed) {
                valueEl.textContent = maskSensitiveValue(btn.dataset.key, btn.dataset.value);
                valueEl.setAttribute('data-revealed', 'false');
                btn.querySelector('i').className = 'fas fa-eye';
                if (isSensitiveKey(btn.dataset.key)) {
                    valueEl.classList.add('masked');
                }
            } else {
                valueEl.textContent = btn.dataset.value;
                valueEl.setAttribute('data-revealed', 'true');
                btn.querySelector('i').className = 'fas fa-eye-slash';
                valueEl.classList.remove('masked');
            }
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            groupInput.value = btn.dataset.group;
            keyInput.value = btn.dataset.key;
            valueInput.value = btn.dataset.value;

            // Scroll to input section
            document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.dataset.group;
            const key = btn.dataset.key;

            if (confirm(`Are you sure you want to delete "${key}" from "${group}"?`)) {
                chrome.storage.local.get([group], (result) => {
                    const groupData = result[group] || {};
                    delete groupData[key];

                    chrome.storage.local.set({ [group]: groupData }, () => {
                        showToast(`'${key}' has been deleted from '${group}'`);
                        loadAndDisplayData();
                    });
                });
            }
        });
    });

    document.querySelectorAll('.delete-group-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.dataset.group;

            if (confirm(`Are you sure you want to delete the entire "${group}" group and all its items?`)) {
                chrome.storage.local.remove([group], () => {
                    showToast(`Group '${group}' has been deleted`);
                    loadAndDisplayData();
                    updateGroupDatalist();
                });
            }
        });
    });
}

function updateFilterChips(groups) {
    const allChips = document.querySelectorAll('.filter-chip');
    allChips.forEach(chip => {
        if (chip.dataset.filter !== 'all') {
            chip.remove();
        }
    });

    groups.forEach(group => {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.textContent = group;
        chip.dataset.filter = group;

        if (currentFilter === group) {
            chip.classList.add('active');
        }

        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = group;
            loadAndDisplayData();
        });

        filterChips.appendChild(chip);
    });

    // Make sure "All" is active if needed
    if (currentFilter === 'all') {
        document.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
    }

    // Handle clicks on "All" chip
    document.querySelector('.filter-chip[data-filter="all"]').addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
        currentFilter = 'all';
        loadAndDisplayData();
    });
}

function updateGroupDatalist() {
    chrome.storage.local.get(null, (allGroups) => {
        groupList.innerHTML = '';
        Object.keys(allGroups).forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            groupList.appendChild(option);
        });
    });
}

function handleSearch() {
    currentSearch = searchInput.value.trim();
    loadAndDisplayData();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    if (type === 'success') {
        toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    } else if (type === 'error') {
        toast.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    }

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function isSensitiveKey(key) {
    const sensitiveKeys = ['password', 'pwd', 'passcode', 'pin', 'secret', 'token', 'key'];
    return sensitiveKeys.some(k => key.toLowerCase().includes(k));
}

function maskSensitiveValue(key, value) {
    if (isSensitiveKey(key)) {
        return '•'.repeat(Math.min(value.length, 8));
    }
    return value;
}

function togglePasswordVisibility() {
    isPasswordVisible = !isPasswordVisible;

    if (isPasswordVisible) {
        valueInput.type = 'text';
        togglePasswordBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        valueInput.type = 'password';
        togglePasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// Password Generator Modal
function openPasswordGenerator() {
    passwordModal.style.display = 'block';
    generateNewPassword();
}

function closePasswordGenerator() {
    passwordModal.style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === passwordModal) {
        closePasswordGenerator();
    }
});

function updatePasswordLengthValue() {
    lengthValue.textContent = passwordLength.value;
}

function generateNewPassword() {
    const length = parseInt(passwordLength.value);
    const hasUpper = includeUpper.checked;
    const hasLower = includeLower.checked;
    const hasNumbers = includeNumbers.checked;
    const hasSymbols = includeSymbols.checked;

    if (!hasUpper && !hasLower && !hasNumbers && !hasSymbols) {
        generatedPassword.value = '';
        return;
    }

    let chars = '';
    if (hasUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (hasLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (hasNumbers) chars += '0123456789';
    if (hasSymbols) chars += '!@#$%^&*()_-+={}[]|:;<>,.?/~';

    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        password += chars[randomIndex];
    }

    // Ensure at least one character of each checked type
    let finalPassword = password;
    if (hasUpper && !/[A-Z]/.test(password)) {
        const randomUpperChar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        finalPassword = randomUpperChar + finalPassword.slice(1);
    }
    if (hasLower && !/[a-z]/.test(password)) {
        const randomLowerChar = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        finalPassword = finalPassword.slice(0, 1) + randomLowerChar + finalPassword.slice(2);
    }
    if (hasNumbers && !/[0-9]/.test(password)) {
        const randomNumber = '0123456789'[Math.floor(Math.random() * 10)];
        finalPassword = finalPassword.slice(0, 2) + randomNumber + finalPassword.slice(3);
    }
    if (hasSymbols && !/[!@#$%^&*()_\-+={}[\]|:;<>,.?/~]/.test(password)) {
        const symbols = '!@#$%^&*()_-+={}[]|:;<>,.?/~';
        const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        finalPassword = finalPassword.slice(0, 3) + randomSymbol + finalPassword.slice(4);
    }

    generatedPassword.value = finalPassword.slice(0, length);
}

function copyGeneratedPassword() {
    if (!generatedPassword.value) return;

    navigator.clipboard.writeText(generatedPassword.value)
        .then(() => {
            copyPasswordBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyPasswordBtn.innerHTML = '<i class="fas fa-copy"></i>';
            }, 1500);
        });
}

function useGeneratedPassword() {
    if (!generatedPassword.value) return;

    valueInput.value = generatedPassword.value;
    closePasswordGenerator();
    showToast('Password applied to value field');
}

// Export/Import Data
function exportData() {
    chrome.storage.local.get(null, (allData) => {
        const dataStr = JSON.stringify(allData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `securevault_backup_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        showToast('Data exported successfully');
    });
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);

            if (confirm('This will merge the imported data with your existing data. Continue?')) {
                chrome.storage.local.get(null, (existingData) => {
                    // Merge data
                    const mergedData = { ...existingData };

                    Object.entries(importedData).forEach(([group, items]) => {
                        if (mergedData[group]) {
                            // Group exists, merge items
                            mergedData[group] = { ...mergedData[group], ...items };
                        } else {
                            // New group
                            mergedData[group] = items;
                        }
                    });

                    chrome.storage.local.clear(() => {
                        chrome.storage.local.set(mergedData, () => {
                            showToast('Data imported successfully');
                            loadAndDisplayData();
                            updateGroupDatalist();
                            importFile.value = ''; // Reset file input
                        });
                    });
                });
            } else {
                importFile.value = ''; // Reset file input
            }
        } catch (error) {
            showToast('Error importing data. Invalid file format.', 'error');
            importFile.value = ''; // Reset file input
        }
    };
    reader.readAsText(file);
}

function confirmClearAllData() {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
        if (confirm('FINAL WARNING: All your stored keys and values will be permanently deleted.')) {
            chrome.storage.local.clear(() => {
                showToast('All data has been cleared');
                loadAndDisplayData();
                updateGroupDatalist();
            });
        }
    }
}

// Initialize default UI state
valueInput.type = 'password';

// Window close event - clean up any revealing of sensitive data
window.addEventListener('beforeunload', () => {
    // Reset any revealed passwords for security
    document.querySelectorAll('.item-value[data-revealed="true"]').forEach(el => {
        el.setAttribute('data-revealed', 'false');
    });
});