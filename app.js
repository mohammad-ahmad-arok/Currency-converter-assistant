// Currency Transition Helper App
// Main application logic

// App State
const appState = {
    currentScreen: 'converter',
    conversionRate: 100, // Fixed rate: 1 new = 100 old (remove two zeros)
    savedCalculations: [],
    largeTextMode: false,
    themeMode: null // null = auto, 'dark' or 'light'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadSavedData();
    initializeEventListeners();
    initializePWA();
    updateExchangeRatesDisplay();
    initializeCashBreakdown();
});

// Initialize theme based on system preference or saved preference
function initializeTheme() {
    const saved = localStorage.getItem('currencyAppData');
    let themeMode = null;
    
    if (saved) {
        const data = JSON.parse(saved);
        themeMode = data.themeMode;
    }
    
    // If no saved preference, detect system preference
    if (themeMode === null) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        themeMode = prefersDark ? 'dark' : 'light';
    }
    
    applyTheme(themeMode, false); // false = don't save yet (initial load)
    appState.themeMode = themeMode;
}

// Apply theme without page refresh
function applyTheme(mode, shouldSave = true) {
    if (mode === 'light') {
        document.body.classList.add('light-mode');
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.checked = true;
    } else {
        document.body.classList.remove('light-mode');
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.checked = false;
    }
    appState.themeMode = mode;
    if (shouldSave) {
        saveData();
    }
}

// Load saved data from localStorage
function loadSavedData() {
    const saved = localStorage.getItem('currencyAppData');
    if (saved) {
        const data = JSON.parse(saved);
        appState.savedCalculations = data.savedCalculations || [];
        appState.largeTextMode = data.largeTextMode || false;
        
        if (appState.largeTextMode) {
            document.body.classList.add('large-text');
            const largeTextToggle = document.getElementById('largeTextMode');
            if (largeTextToggle) largeTextToggle.checked = true;
        }
    }
}

// Save data to localStorage
function saveData() {
    const data = {
        savedCalculations: appState.savedCalculations,
        largeTextMode: appState.largeTextMode,
        themeMode: appState.themeMode
    };
    localStorage.setItem('currencyAppData', JSON.stringify(data));
}

// Initialize event listeners
function initializeEventListeners() {
    // Screen navigation
    document.querySelectorAll('.screen-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const screen = e.target.dataset.screen;
            switchScreen(screen);
        });
    });

    // Settings modal
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
            closeSettings();
        }
    });

    // Currency converter
    document.getElementById('convertBtn').addEventListener('click', performConversion);
    document.getElementById('amountInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performConversion();
    });

    // Cash breakdown
    document.getElementById('addDenominationBtn').addEventListener('click', addBanknoteDenomination);

    // Comparison
    document.getElementById('compareBtn').addEventListener('click', performComparison);
    document.getElementById('beforeAmount').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performComparison();
    });
    document.getElementById('afterAmount').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performComparison();
    });

    // Scenarios
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const scenario = e.target.dataset.scenario;
            showScenario(scenario);
        });
    });

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            const newMode = e.target.checked ? 'light' : 'dark';
            applyTheme(newMode);
        });
    }

    // Large text mode toggle
    document.getElementById('largeTextMode').addEventListener('change', (e) => {
        appState.largeTextMode = e.target.checked;
        if (e.target.checked) {
            document.body.classList.add('large-text');
        } else {
            document.body.classList.remove('large-text');
        }
        saveData();
    });
}

// Screen navigation
function switchScreen(screenName) {
    appState.currentScreen = screenName;
    
    // Update buttons
    document.querySelectorAll('.screen-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.screen === screenName) {
            btn.classList.add('active');
        }
    });

    // Update screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(`${screenName}Screen`).classList.add('active');
}

// Settings modal
function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

// Currency Conversion
function performConversion() {
    const amount = parseFloat(document.getElementById('amountInput').value);
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;

    if (!amount || amount < 0) {
        showError('converterResult', 'يرجى إدخال مبلغ صحيح');
        return;
    }

    if (fromCurrency === toCurrency) {
        showError('converterResult', 'العملتان متشابهتان');
        return;
    }

    showLoading();
    
    setTimeout(() => {
        const result = convertCurrency(amount, fromCurrency, toCurrency);
        document.getElementById('convertedAmount').textContent = formatNumber(result);
        document.getElementById('converterResult').style.display = 'block';
        hideLoading();
        
        // Save calculation
        saveCalculation({
            type: 'conversion',
            amount,
            from: fromCurrency,
            to: toCurrency,
            result,
            timestamp: new Date().toISOString()
        });
    }, 300);
}

function convertCurrency(amount, from, to) {
    const rate = appState.conversionRate; // Fixed: 100
    
    // Simplified conversion: 1 new = 100 old (remove two zeros)
    if (from === 'old' && to === 'new') {
        // Old to New: divide by 100 (remove two zeros)
        return amount / rate;
    } else if (from === 'new' && to === 'old') {
        // New to Old: multiply by 100 (add two zeros)
        return amount * rate;
    } else if (from === to) {
        // Same currency
        return amount;
    } else if (from === 'usd' || to === 'usd') {
        // USD conversions - for now, treat USD same as new currency
        // This can be adjusted if USD rate is needed
        if (from === 'usd' && to === 'old') {
            return amount * rate;
        } else if (from === 'old' && to === 'usd') {
            return amount / rate;
        } else {
            return amount; // USD to/from new is 1:1
        }
    }
    
    return 0;
}

// Cash Breakdown
let banknoteDenominations = [
    { value: 500, count: 0 },
    { value: 1000, count: 0 },
    { value: 2000, count: 0 },
    { value: 5000, count: 0 }
];

function initializeCashBreakdown() {
    updateBanknotesDisplay();
    calculateBreakdown();
}

function addBanknoteDenomination() {
    const value = prompt('أدخل قيمة الفئة (مثال: 500)');
    if (value && !isNaN(value) && parseFloat(value) > 0) {
        banknoteDenominations.push({
            value: parseFloat(value),
            count: 0
        });
        updateBanknotesDisplay();
    }
}

function updateBanknotesDisplay() {
    const container = document.getElementById('banknotesContainer');
    container.innerHTML = '';
    
    banknoteDenominations.forEach((denom, index) => {
        const item = document.createElement('div');
        item.className = 'banknote-item';
        item.innerHTML = `
            <span class="banknote-label">${formatNumber(denom.value, false)} ليرة</span>
            <input 
                type="number" 
                min="0" 
                value="${denom.count}" 
                data-index="${index}"
                placeholder="عدد الأوراق"
                class="banknote-count-input"
            >
            <button class="remove-banknote-btn" data-index="${index}">حذف</button>
        `;
        container.appendChild(item);
    });
    
    // Add event listeners
    document.querySelectorAll('.banknote-count-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            banknoteDenominations[index].count = parseInt(e.target.value) || 0;
            calculateBreakdown();
        });
    });
    
    document.querySelectorAll('.remove-banknote-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (banknoteDenominations.length > 1) {
                banknoteDenominations.splice(index, 1);
                updateBanknotesDisplay();
                calculateBreakdown();
            } else {
                alert('يجب أن يكون هناك فئة واحدة على الأقل');
            }
        });
    });
}

function calculateBreakdown() {
    let total = 0;
    banknoteDenominations.forEach(denom => {
        total += denom.value * denom.count;
    });
    
    document.getElementById('breakdownTotal').textContent = formatNumber(total);
    
    // Convert to new currency (assuming total is in old currency)
    const converted = convertCurrency(total, 'old', 'new');
    document.getElementById('breakdownConverted').textContent = formatNumber(converted);
}

// Exchange Rates Display
function updateExchangeRatesDisplay() {
    const rate = appState.conversionRate;
    document.getElementById('conversionRate').textContent = `1 : ${rate}`;
}

// Before/After Comparison
function performComparison() {
    const before = parseFloat(document.getElementById('beforeAmount').value);
    const after = parseFloat(document.getElementById('afterAmount').value);
    
    if (!before || before < 0 || !after || after < 0) {
        showError('comparisonResult', 'يرجى إدخال مبالغ صحيحة');
        return;
    }
    
    const difference = after - before;
    const percentageValue = (difference / before) * 100;
    // Format percentage to remove trailing zeros
    let percentage = percentageValue.toFixed(2);
    percentage = percentage.replace(/\.0+$/, ''); // Remove .00
    percentage = percentage.replace(/(\.\d*?)0+$/, '$1'); // Remove trailing zeros (e.g., 15.50 → 15.5)
    
    document.getElementById('differenceAmount').textContent = formatNumber(difference);
    document.getElementById('percentageChange').textContent = `${percentage}%`;
    document.getElementById('comparisonResult').style.display = 'block';
    
    // Color code the result
    const diffElement = document.getElementById('differenceAmount');
    const percentElement = document.getElementById('percentageChange');
    
    if (difference > 0) {
        diffElement.style.color = 'var(--success-color)';
        percentElement.style.color = 'var(--success-color)';
    } else if (difference < 0) {
        diffElement.style.color = 'var(--error-color)';
        percentElement.style.color = 'var(--error-color)';
    } else {
        diffElement.style.color = 'var(--text-primary)';
        percentElement.style.color = 'var(--text-primary)';
    }
    
    // Save calculation
    saveCalculation({
        type: 'comparison',
        before,
        after,
        difference,
        percentage,
        timestamp: new Date().toISOString()
    });
}

// Preset Scenarios
function showScenario(scenario) {
    const content = document.getElementById('scenarioContent');
    
    const scenarios = {
        salary: {
            title: 'حساب الراتب',
            description: 'احسب قيمة راتبك بالعملة الجديدة. الفكرة بسيطة: نحذف صفرين من الرقم.',
            fields: [
                { label: 'الراتب الحالي (بالعملة القديمة)', id: 'scenario-amount' }
            ],
            calculate: (amount) => {
                const converted = convertCurrency(amount, 'old', 'new');
                return {
                    label: 'الراتب بالعملة الجديدة',
                    value: converted,
                    note: 'القيمة الحقيقية لم تتغير، فقط الأرقام أصبحت أبسط'
                };
            }
        },
        rent: {
            title: 'حساب الإيجار',
            description: 'احسب قيمة الإيجار بالعملة الجديدة. نفس القيمة، أرقام أبسط.',
            fields: [
                { label: 'الإيجار الحالي (بالعملة القديمة)', id: 'scenario-amount' }
            ],
            calculate: (amount) => {
                const converted = convertCurrency(amount, 'old', 'new');
                return {
                    label: 'الإيجار بالعملة الجديدة',
                    value: converted,
                    note: 'القيمة الحقيقية لم تتغير، فقط الأرقام أصبحت أبسط'
                };
            }
        },
        debt: {
            title: 'حساب الدين',
            description: 'احسب قيمة الدين بالعملة الجديدة. لا يوجد خسارة في القيمة بسبب التحويل.',
            fields: [
                { label: 'مبلغ الدين (بالعملة القديمة)', id: 'scenario-amount' }
            ],
            calculate: (amount) => {
                const converted = convertCurrency(amount, 'old', 'new');
                return {
                    label: 'قيمة الدين بالعملة الجديدة',
                    value: converted,
                    note: 'القيمة الحقيقية لم تتغير، فقط الأرقام أصبحت أبسط'
                };
            }
        },
        product: {
            title: 'سعر المنتج',
            description: 'احسب سعر المنتج بالعملة الجديدة. نفس القيمة، أرقام أبسط للحساب.',
            fields: [
                { label: 'السعر الحالي (بالعملة القديمة)', id: 'scenario-amount' }
            ],
            calculate: (amount) => {
                const converted = convertCurrency(amount, 'old', 'new');
                return {
                    label: 'السعر بالعملة الجديدة',
                    value: converted,
                    note: 'القيمة الحقيقية لم تتغير، فقط الأرقام أصبحت أبسط'
                };
            }
        }
    };
    
    const scenarioData = scenarios[scenario];
    if (!scenarioData) return;
    
    let html = `
        <h3 style="margin-bottom: 12px;">${scenarioData.title}</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">${scenarioData.description}</p>
        <div class="scenario-form">
    `;
    
    scenarioData.fields.forEach(field => {
        html += `
            <div class="input-group">
                <label for="${field.id}">${field.label}</label>
                <input type="number" id="${field.id}" class="amount-input" placeholder="أدخل المبلغ" min="0" step="0.01">
            </div>
        `;
    });
    
    html += `
            <button class="calculate-btn" id="scenario-calculate-btn">احسب</button>
            <div class="scenario-result" id="scenario-result" style="display: none;">
                <p class="result-label" id="scenario-result-label"></p>
                <p class="result-amount" id="scenario-result-value"></p>
                <p class="result-note" id="scenario-result-note" style="display: none;"></p>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    
    // Add calculate button listener
    document.getElementById('scenario-calculate-btn').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('scenario-amount').value);
        if (!amount || amount < 0) {
            alert('يرجى إدخال مبلغ صحيح');
            return;
        }
        
        const result = scenarioData.calculate(amount);
        document.getElementById('scenario-result-label').textContent = result.label;
        document.getElementById('scenario-result-value').textContent = formatNumber(result.value);
        if (result.note) {
            document.getElementById('scenario-result-note').textContent = result.note;
            document.getElementById('scenario-result-note').style.display = 'block';
        }
        document.getElementById('scenario-result').style.display = 'block';
        
        // Save calculation
        saveCalculation({
            type: 'scenario',
            scenario,
            amount,
            result: result.value,
            timestamp: new Date().toISOString()
        });
    });
    
    // Allow Enter key
    document.getElementById('scenario-amount').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('scenario-calculate-btn').click();
        }
    });
}

// Utility Functions
function formatNumber(num, includeCurrency = true) {
    if (isNaN(num)) return includeCurrency ? '- ليرة سورية' : '-';
    
    // Format number with Arabic locale
    let formatted = new Intl.NumberFormat('ar-SY', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(num);
    
    // Remove trailing zeros after decimal point
    formatted = formatted.replace(/\.0+$/, ''); // Remove .00, .0, etc.
    formatted = formatted.replace(/(\.\d*?)0+$/, '$1'); // Remove trailing zeros in decimals (e.g., 15.50 → 15.5)
    
    // Add currency label if requested
    if (includeCurrency) {
        formatted += ' ليرة سورية';
    }
    
    return formatted;
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<p style="color: var(--error-color); text-align: center;">${message}</p>`;
    element.style.display = 'block';
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function saveCalculation(calculation) {
    appState.savedCalculations.push(calculation);
    // Keep only last 50 calculations
    if (appState.savedCalculations.length > 50) {
        appState.savedCalculations.shift();
    }
    saveData();
}

// PWA Installation
let deferredPrompt;

function initializePWA() {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.getElementById('installStatus').textContent = 'التطبيق مثبت بالفعل';
        return;
    }
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('installBtn').style.display = 'block';
    });
    
    // Install button click
    document.getElementById('installBtn').addEventListener('click', async () => {
        if (!deferredPrompt) {
            document.getElementById('installStatus').textContent = 'التثبيت غير متاح';
            return;
        }
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            document.getElementById('installStatus').textContent = 'تم التثبيت بنجاح!';
            document.getElementById('installBtn').style.display = 'none';
        } else {
            document.getElementById('installStatus').textContent = 'تم إلغاء التثبيت';
        }
        
        deferredPrompt = null;
    });
    
    // Check if already installed
    window.addEventListener('appinstalled', () => {
        document.getElementById('installStatus').textContent = 'تم تثبيت التطبيق بنجاح!';
        document.getElementById('installBtn').style.display = 'none';
        deferredPrompt = null;
    });
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

