// Currency Transition Helper App
// Main application logic

// App State
const appState = {
    currentScreen: 'converter',
    conversionRate: 100, // Fixed rate: 1 new = 100 old (remove two zeros)
    exchangeRates: {
        USD: { toOld: null, toNew: null, ask: null, bid: null, lastUpdate: null },
        EUR: { toOld: null, toNew: null, ask: null, bid: null, lastUpdate: null },
        SAR: { toOld: null, toNew: null, ask: null, bid: null, lastUpdate: null },
        TRY: { toOld: null, toNew: null, ask: null, bid: null, lastUpdate: null }
    },
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
    fetchExchangeRates(); // Fetch exchange rates on app load
    updateExchangeRateDisplay(); // Update exchange rate display
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
        if (data.exchangeRates) {
            appState.exchangeRates = { ...appState.exchangeRates, ...data.exchangeRates };
        } else if (data.usdRates) {
            // Migrate old usdRates format to new exchangeRates format
            appState.exchangeRates.USD = {
                toOld: data.usdRates.toOld,
                toNew: data.usdRates.toNew,
                ask: data.usdRates.toNew,
                bid: null,
                lastUpdate: data.usdRates.lastUpdate
            };
        }

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
        themeMode: appState.themeMode,
        exchangeRates: appState.exchangeRates
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

    // Currency selector change - show/hide exchange rate
    document.getElementById('fromCurrency').addEventListener('change', updateExchangeRateDisplay);
    document.getElementById('toCurrency').addEventListener('change', updateExchangeRateDisplay);

    // Exchange Rate refresh button
    const refreshExchangeRateBtn = document.getElementById('refreshExchangeRateBtn');
    if (refreshExchangeRateBtn) {
        refreshExchangeRateBtn.addEventListener('click', async () => {
            refreshExchangeRateBtn.disabled = true;
            refreshExchangeRateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await fetchExchangeRates();
            updateExchangeRateDisplay();
            refreshExchangeRateBtn.disabled = false;
            refreshExchangeRateBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        });
    }

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
const currencyLabels = {
    'old': 'ليرة سورية قديمة',
    'new': 'ليرة سورية جديدة',
    'usd': 'دولار أمريكي',
    'eur': 'يورو',
    'sar': 'ريال سعودي',
    'try': 'ليرة تركية'
};

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
        try {
            const result = convertCurrency(amount, fromCurrency, toCurrency);
            const targetCurrency = toCurrency;
            const label = currencyLabels[targetCurrency] || 'ليرة سورية';

            document.getElementById('convertedAmount').textContent = formatNumber(result, label);
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
        } catch (error) {
            hideLoading();
            if (error.message === 'EXCHANGE_RATE_UNAVAILABLE') {
                showError('converterResult', 'غير قادر على جلب معلومات الصرف. يرجى تحديث سعر الصرف أولاً.');
            } else {
                showError('converterResult', 'حدث خطأ أثناء الحساب. يرجى المحاولة مرة أخرى.');
            }
        }
    }, 300);
}

// Currency code mapping
const currencyMap = {
    'usd': 'USD',
    'eur': 'EUR',
    'sar': 'SAR',
    'try': 'TRY'
};

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
    }

    // Foreign currency conversions
    const foreignCurrencies = ['usd', 'eur', 'sar', 'try'];
    const fromIsForeign = foreignCurrencies.includes(from);
    const toIsForeign = foreignCurrencies.includes(to);

    if (fromIsForeign || toIsForeign) {
        const currencyCode = currencyMap[from] || currencyMap[to];
        const exchangeRate = appState.exchangeRates[currencyCode];

        // Check if rates are available
        if (!exchangeRate || (!exchangeRate.toNew && !exchangeRate.toOld)) {
            throw new Error('EXCHANGE_RATE_UNAVAILABLE');
        }

        // Use ask price (سعر الشراء) - the price at which you buy from the bank
        const rateValue = parseFloat(exchangeRate.ask || exchangeRate.toNew);
        if (!rateValue || rateValue <= 0) {
            throw new Error('EXCHANGE_RATE_UNAVAILABLE');
        }

        // Determine if rate is for old or new currency
        // If rate > 1000, it's likely for old currency; otherwise for new
        const isOldCurrencyRate = rateValue > 1000;
        const rateForOld = isOldCurrencyRate ? rateValue : rateValue * 100;
        const rateForNew = isOldCurrencyRate ? rateValue / 100 : rateValue;

        if (fromIsForeign && to === 'old') {
            // Foreign currency to Old Syrian Pound
            return amount * rateForOld;
        } else if (fromIsForeign && to === 'new') {
            // Foreign currency to New Syrian Pound
            return amount * rateForNew;
        } else if (from === 'old' && toIsForeign) {
            // Old Syrian Pound to Foreign currency
            return amount / rateForOld;
        } else if (from === 'new' && toIsForeign) {
            // New Syrian Pound to Foreign currency
            return amount / rateForNew;
        } else if (fromIsForeign && toIsForeign) {
            // Convert between two foreign currencies via SYP
            // First convert from currency to new SYP, then to target currency
            const fromRate = parseFloat(appState.exchangeRates[currencyMap[from]].ask || appState.exchangeRates[currencyMap[from]].toNew);
            const toRate = parseFloat(appState.exchangeRates[currencyMap[to]].ask || appState.exchangeRates[currencyMap[to]].toNew);

            if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
                throw new Error('EXCHANGE_RATE_UNAVAILABLE');
            }

            const fromRateNew = fromRate > 1000 ? fromRate / 100 : fromRate;
            const toRateNew = toRate > 1000 ? toRate / 100 : toRate;

            return (amount * fromRateNew) / toRateNew;
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

// Update Exchange Rate Display in Converter Screen
function updateExchangeRateDisplay() {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const exchangeRateDisplay = document.getElementById('exchangeRateDisplay');
    const exchangeRateValue = document.getElementById('exchangeRateValue');
    const exchangeRateLabel = document.getElementById('exchangeRateLabel');
    const exchangeRateError = document.getElementById('exchangeRateError');

    const foreignCurrencies = ['usd', 'eur', 'sar', 'try'];
    const currencyNames = {
        'usd': 'الدولار',
        'eur': 'اليورو',
        'sar': 'الريال السعودي',
        'try': 'الليرة التركية'
    };

    const selectedForeign = fromCurrency in currencyNames ? fromCurrency : (toCurrency in currencyNames ? toCurrency : null);

    // Show exchange rate display only if foreign currency is selected
    if (selectedForeign) {
        exchangeRateDisplay.style.display = 'block';
        exchangeRateError.style.display = 'none';

        const currencyCode = currencyMap[selectedForeign];
        const exchangeRate = appState.exchangeRates[currencyCode];
        const currencyName = currencyNames[selectedForeign];

        exchangeRateLabel.textContent = `سعر ${currencyName} اليوم:`;

        if (exchangeRate && exchangeRate.ask) {
            // Show the rate
            const rateValue = parseFloat(exchangeRate.ask);
            const isOldCurrencyRate = rateValue > 1000;
            const rateForNew = isOldCurrencyRate ? rateValue / 100 : rateValue;

            exchangeRateValue.textContent = `${formatNumber(rateForNew, false)} ليرة جديدة`;
            exchangeRateValue.style.color = 'var(--text-primary)';
        } else {
            // Show error
            exchangeRateValue.textContent = 'غير متوفر';
            exchangeRateValue.style.color = 'var(--error-color)';
            exchangeRateError.textContent = 'غير قادر على جلب معلومات الصرف من الموقع. يرجى المحاولة مرة أخرى.';
            exchangeRateError.style.display = 'block';
        }
    } else {
        exchangeRateDisplay.style.display = 'none';
    }
}

// Fetch exchange rates from sp-today.com API
async function fetchExchangeRates() {
    try {
        // Check if we have recent rates (less than 1 hour old)
        const currencies = ['USD', 'EUR', 'SAR', 'TRY'];
        let hasRecentRates = true;

        for (const currency of currencies) {
            const rate = appState.exchangeRates[currency];
            if (!rate || !rate.lastUpdate) {
                hasRecentRates = false;
                break;
            }
            const lastUpdate = new Date(rate.lastUpdate);
            const now = new Date();
            const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
            if (hoursDiff >= 1 || !rate.ask) {
                hasRecentRates = false;
                break;
            }
        }

        if (hasRecentRates) {
            console.log('Using cached exchange rates');
            return; // Use cached rates if less than 1 hour old
        }

        // Fetch from API
        const apiUrl = `https://script.google.com/macros/s/AKfycbza6AAxzPF_BGNP9K4T1saIAfjCGKW1E5rOJEeSDFRDrd549KGVPV42m1TVmnXvI-uhuw/exec`;

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch exchange rates');
        }

        const data = await response.json();

        // Process each currency
        for (const currency of data) {
            const currencyCode = currency.name;
            if (currencyCode in appState.exchangeRates) {
                const ask = parseFloat(currency.ask);
                const bid = parseFloat(currency.bid);

                if (ask && ask > 0) {
                    // Determine if rate is for old or new currency
                    // If rate > 1000, likely old currency; if < 1000, likely new currency
                    const isOldCurrencyRate = ask > 1000;

                    appState.exchangeRates[currencyCode].ask = ask;
                    appState.exchangeRates[currencyCode].bid = bid;
                    appState.exchangeRates[currencyCode].toOld = isOldCurrencyRate ? ask : ask * 100;
                    appState.exchangeRates[currencyCode].toNew = isOldCurrencyRate ? ask / 100 : ask;
                    appState.exchangeRates[currencyCode].lastUpdate = new Date().toISOString();
                }
            }
        }

        saveData();
        updateExchangeRateDisplay(); // Update display after fetching
        console.log('Exchange rates updated:', appState.exchangeRates);
    } catch (error) {
        console.error('Error fetching exchange rates from sp-today.com:', error);
        // Clear rates on error
        const currencies = ['USD', 'EUR', 'SAR', 'TRY'];
        for (const currency of currencies) {
            appState.exchangeRates[currency].ask = null;
            appState.exchangeRates[currency].bid = null;
            appState.exchangeRates[currency].toOld = null;
            appState.exchangeRates[currency].toNew = null;
        }
        saveData();
        updateExchangeRateDisplay();
    }
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
function formatNumber(num, currencyLabel = 'ليرة سورية') {
    if (isNaN(num)) return '-';

    // Format number with Arabic locale
    let formatted = new Intl.NumberFormat('ar-SY', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(num);

    // Remove trailing zeros after decimal point
    formatted = formatted.replace(/\.0+$/, '');
    formatted = formatted.replace(/(\.\d*?)0+$/, '$1');

    // Add currency label
    if (currencyLabel) {
        formatted += ' ' + currencyLabel;
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
    const installBtn = document.getElementById('installBtn');
    const installStatus = document.getElementById('installStatus');

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
        installStatus.textContent = 'التطبيق مثبت بالفعل';
        installBtn.style.display = 'none';
        return;
    }

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
        // iOS doesn't support beforeinstallprompt, show manual instructions
        installStatus.innerHTML = `
            <strong>لتثبيت التطبيق على iOS:</strong><br>
            1. اضغط على زر المشاركة (Share) في Safari<br>
            2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen)<br>
            3. اضغط "إضافة" (Add)
        `;
        installBtn.style.display = 'none';
        return;
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
        installStatus.textContent = 'جاهز للتثبيت';
    });

    // Install button click
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            installStatus.textContent = 'التثبيت غير متاح حالياً';
            return;
        }

        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                installStatus.textContent = 'جاري التثبيت...';
                installBtn.style.display = 'none';
            } else {
                installStatus.textContent = 'تم إلغاء التثبيت';
            }
        } catch (error) {
            console.error('Installation error:', error);
            installStatus.textContent = 'حدث خطأ أثناء التثبيت';
        }

        deferredPrompt = null;
    });

    // Check if already installed
    window.addEventListener('appinstalled', () => {
        installStatus.textContent = 'تم تثبيت التطبيق بنجاح!';
        installBtn.style.display = 'none';
        deferredPrompt = null;
    });
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then(registration => {
                console.log('Service Worker registered:', registration);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available, user can refresh
                            console.log('New service worker available');
                        }
                    });
                });
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

