const uploadZone = document.getElementById('upload-zone');
const compressInput = document.getElementById('compress-input');
const compressionTool = document.getElementById('compression-tool');
const beforeImage = document.getElementById('before-image');
const afterImage = document.getElementById('after-image');
const loadingOverlay = document.getElementById('loading-overlay');
const compressBtn = document.getElementById('compress-btn');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const qualityRange = document.getElementById('quality-range');
const qualityValue = document.getElementById('quality-value');
const autoOptimize = document.getElementById('auto-optimize');
const outputFormat = document.getElementById('output-format');
const qualityControl = document.getElementById('quality-control');
const formatControl = document.getElementById('format-control');

// Stats elements
const beforeSize = document.getElementById('before-size');
const beforeDimensions = document.getElementById('before-dimensions');
const beforeFormat = document.getElementById('before-format');
const afterSize = document.getElementById('after-size');
const afterDimensions = document.getElementById('after-dimensions');
const savingsPercent = document.getElementById('savings-percent');

// Store original image data
let originalFile = null;
let originalImage = null;
let compressedBlob = null;
let originalImageType = '';
let hasTransparency = false;

// Initialize upload zone
if (uploadZone) {
    uploadZone.addEventListener('click', () => {
        compressInput.click();
    });

    compressInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileSelect(file);
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileSelect(file);
        }
    });
}

function handleFileSelect(file) {
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимум 10MB');
        return;
    }

    originalFile = file;
    originalImageType = file.type;

    const reader = new FileReader();
    reader.onload = (e) => {
        originalImage = new Image();
        originalImage.onload = () => {
            // Show BEFORE image
            beforeImage.src = e.target.result;
            beforeSize.textContent = formatFileSize(file.size);
            beforeDimensions.textContent = `${originalImage.naturalWidth} × ${originalImage.naturalHeight}`;
            beforeFormat.textContent = file.type.split('/')[1].toUpperCase();

            // Check for transparency (PNG only)
            hasTransparency = checkTransparency(originalImage);

            // Update format options based on source type
            updateFormatOptions();

            // Show compression tool
            uploadZone.style.display = 'none';
            compressionTool.style.display = 'block';

            // Auto-optimize if enabled
            if (autoOptimize.checked) {
                applyAutoOptimization();
            }
        };
        originalImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function checkTransparency(img) {
    if (originalImageType !== 'image/png') return false;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) return true;
    }
    return false;
}

function updateFormatOptions() {
    if (!outputFormat) return;
    
    outputFormat.innerHTML = '';
    
    if (originalImageType === 'image/png' && hasTransparency) {
        const pngOption = document.createElement('option');
        pngOption.value = 'image/png';
        pngOption.textContent = 'PNG (сохранить прозрачность)';
        outputFormat.appendChild(pngOption);
        
        const webpOption = document.createElement('option');
        webpOption.value = 'image/webp';
        webpOption.textContent = 'WebP (рекомендуется)';
        webpOption.selected = true;
        outputFormat.appendChild(webpOption);
    } else if (originalImageType === 'image/jpeg') {
        const webpOption = document.createElement('option');
        webpOption.value = 'image/webp';
        webpOption.textContent = 'WebP (рекомендуется)';
        webpOption.selected = true;
        outputFormat.appendChild(webpOption);
        
        const jpegOption = document.createElement('option');
        jpegOption.value = 'image/jpeg';
        jpegOption.textContent = 'JPEG';
        outputFormat.appendChild(jpegOption);
    } else {
        const webpOption = document.createElement('option');
        webpOption.value = 'image/webp';
        webpOption.textContent = 'WebP (рекомендуется)';
        webpOption.selected = true;
        outputFormat.appendChild(webpOption);
        
        const jpegOption = document.createElement('option');
        jpegOption.value = 'image/jpeg';
        jpegOption.textContent = 'JPEG';
        outputFormat.appendChild(jpegOption);
        
        const pngOption = document.createElement('option');
        pngOption.value = 'image/png';
        pngOption.textContent = 'PNG';
        outputFormat.appendChild(pngOption);
    }
}

function applyAutoOptimization() {
    if (!originalImage) return;

    qualityControl.classList.add('disabled');
    formatControl.classList.add('disabled');

    let quality = 0.8;

    if (originalFile.size > 5 * 1024 * 1024) {
        quality = 0.7;
    } else if (originalFile.size > 2 * 1024 * 1024) {
        quality = 0.75;
    }

    const webpOption = Array.from(outputFormat.options).find(opt => opt.value === 'image/webp');
    if (webpOption) {
        outputFormat.value = 'image/webp';
    }

    qualityRange.value = Math.round(quality * 100);
    qualityValue.textContent = `${qualityRange.value}%`;
}

if (autoOptimize) {
    autoOptimize.addEventListener('change', () => {
        if (autoOptimize.checked) {
            applyAutoOptimization();
        } else {
            qualityControl.classList.remove('disabled');
            formatControl.classList.remove('disabled');
        }
    });
}

if (qualityRange) {
    qualityRange.addEventListener('input', () => {
        qualityValue.textContent = `${qualityRange.value}%`;
    });
}

if (compressBtn) {
    compressBtn.addEventListener('click', async () => {
        if (!originalImage) return;

        // Show loading
        loadingOverlay.style.display = 'flex';
        compressBtn.disabled = true;
        
        // Clear previous after image
        afterImage.src = '';

        const quality = parseInt(qualityRange.value) / 100;
        let format = outputFormat.value;

        // Smart format validation
        format = validateFormat(format, originalImageType, hasTransparency);

        // Small delay for UI update
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Compress the image
            compressedBlob = await compressImage(originalImage, quality, format);
            
            // ⚠️ IMPORTANT: Create blob URL and update AFTER image
            const afterUrl = URL.createObjectURL(compressedBlob);
            afterImage.src = afterUrl;

            // Update stats
            afterSize.textContent = formatFileSize(compressedBlob.size);
            afterDimensions.textContent = `${originalImage.naturalWidth} × ${originalImage.naturalHeight}`;

            // Calculate savings
            const savings = ((originalFile.size - compressedBlob.size) / originalFile.size * 100).toFixed(1);
            savingsPercent.textContent = savings > 0 ? `-${savings}%` : `+${Math.abs(savings)}%`;
            savingsPercent.className = `stat-value ${savings > 0 ? 'savings' : ''}`;

            // Update download button
            downloadBtn.style.display = 'inline-flex';
            const ext = format.split('/')[1];
            downloadBtn.href = afterUrl;
            downloadBtn.download = `compressed.${ext}`;

        } catch (error) {
            console.error('Compression error:', error);
            alert('Ошибка при сжатии изображения');
        } finally {
            loadingOverlay.style.display = 'none';
            compressBtn.disabled = false;
        }
    });
}

function validateFormat(selectedFormat, sourceType, hasTransparency) {
    // Prevent JPEG→PNG conversion (increases file size)
    if (sourceType === 'image/jpeg' && selectedFormat === 'image/png') {
        return 'image/webp';
    }
    
    // PNG with transparency should stay PNG or WebP
    if (sourceType === 'image/png' && hasTransparency && selectedFormat === 'image/jpeg') {
        return 'image/webp';
    }
    
    return selectedFormat;
}

async function compressImage(img, quality, format) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let width = img.naturalWidth;
    let height = img.naturalHeight;

    // Auto-resize if too large (auto-optimization mode)
    if (autoOptimize.checked && width > 1920) {
        const ratio = 1920 / width;
        width = 1920;
        height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Handle transparency
    if (format === 'image/png') {
        ctx.clearRect(0, 0, width, height);
    } else {
        // White background for JPEG/WebP
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);

    // ⚠️ Return blob from canvas.toBlob()
    return new Promise((resolve, reject) => {
        // PNG doesn't use quality parameter
        const qualityParam = format === 'image/png' ? undefined : quality;
        
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Compression failed'));
                }
            },
            format,
            qualityParam
        );
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        originalFile = null;
        originalImage = null;
        compressedBlob = null;
        compressInput.value = '';
        
        compressionTool.style.display = 'none';
        uploadZone.style.display = 'block';
        
        downloadBtn.style.display = 'none';
        afterImage.src = '';
        beforeImage.src = '';
        qualityRange.value = 80;
        qualityValue.textContent = '80%';
        autoOptimize.checked = true;
        qualityControl.classList.remove('disabled');
        formatControl.classList.remove('disabled');
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================
// PNG TO JPG
// ============================================
const pngInput = document.getElementById('png-input');
const pngPreview = document.getElementById('png-preview');
const convertPngBtn = document.getElementById('convert-png');
const pngDownload = document.getElementById('png-download');
let pngImage = null;

if (pngInput) {
    pngInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    pngImage = img;
                    pngPreview.innerHTML = `<img src="${event.target.result}" alt="Preview" style="max-width:100%;max-height:200px;border-radius:8px;">`;
                    convertPngBtn.disabled = false;
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

if (convertPngBtn) {
    convertPngBtn.addEventListener('click', () => {
        if (!pngImage) return;
        const canvas = document.createElement('canvas');
        canvas.width = pngImage.width;
        canvas.height = pngImage.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(pngImage, 0, 0);
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            pngDownload.href = url;
            pngDownload.download = 'converted.jpg';
            pngDownload.style.display = 'inline-flex';
        }, 'image/jpeg', 0.9);
    });
}

// ============================================
// JPG TO PNG
// ============================================
const jpgInput = document.getElementById('jpg-input');
const jpgPreview = document.getElementById('jpg-preview');
const convertJpgBtn = document.getElementById('convert-jpg');
const jpgDownload = document.getElementById('jpg-download');
let jpgImage = null;

if (jpgInput) {
    jpgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    jpgImage = img;
                    jpgPreview.innerHTML = `<img src="${event.target.result}" alt="Preview" style="max-width:100%;max-height:200px;border-radius:8px;">`;
                    convertJpgBtn.disabled = false;
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

if (convertJpgBtn) {
    convertJpgBtn.addEventListener('click', () => {
        if (!jpgImage) return;
        const canvas = document.createElement('canvas');
        canvas.width = jpgImage.width;
        canvas.height = jpgImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(jpgImage, 0, 0);
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            jpgDownload.href = url;
            jpgDownload.download = 'converted.png';
            jpgDownload.style.display = 'inline-flex';
        }, 'image/png');
    });
}

// ============================================
// IMAGE RESIZE
// ============================================
const resizeInput = document.getElementById('resize-input');
const resizeWidth = document.getElementById('resize-width');
const resizeHeight = document.getElementById('resize-height');
const resizeBtn = document.getElementById('resize-btn');
const resizeDownload = document.getElementById('resize-download');
let resizeImg = null;

if (resizeInput) {
    resizeInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    resizeImg = img;
                    resizeWidth.value = img.width;
                    resizeHeight.value = img.height;
                    resizeBtn.disabled = false;
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

if (resizeBtn) {
    resizeBtn.addEventListener('click', () => {
        if (!resizeImg) return;
        const width = parseInt(resizeWidth.value) || resizeImg.width;
        const height = parseInt(resizeHeight.value) || resizeImg.height;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(resizeImg, 0, 0, width, height);
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            resizeDownload.href = url;
            resizeDownload.download = 'resized.png';
            resizeDownload.style.display = 'inline-flex';
        }, 'image/png');
    });
}

// ============================================
// WORD COUNTER
// ============================================
const wordInput = document.getElementById('word-input');
const wordCount = document.getElementById('word-count');
const charCount = document.getElementById('char-count');
const lineCount = document.getElementById('line-count');

if (wordInput) {
    wordInput.addEventListener('input', () => {
        const text = wordInput.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCount.textContent = words;
        charCount.textContent = text.length;
        const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
        lineCount.textContent = lines;
    });
}

// ============================================
// PASSWORD GENERATOR
// ============================================
const passwordResult = document.getElementById('password-result');
const generatePassword = document.getElementById('generate-password');
const copyPassword = document.getElementById('copy-password');
const pwdLength = document.getElementById('pwd-length');
const pwdLengthValue = document.getElementById('pwd-length-value');
const pwdUppercase = document.getElementById('pwd-uppercase');
const pwdLowercase = document.getElementById('pwd-lowercase');
const pwdNumbers = document.getElementById('pwd-numbers');
const pwdSymbols = document.getElementById('pwd-symbols');

if (pwdLength) {
    pwdLength.addEventListener('input', () => {
        pwdLengthValue.textContent = pwdLength.value;
    });
}

function generatePasswordFunc() {
    const length = parseInt(pwdLength.value);
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let chars = '';
    if (pwdUppercase.checked) chars += uppercase;
    if (pwdLowercase.checked) chars += lowercase;
    if (pwdNumbers.checked) chars += numbers;
    if (pwdSymbols.checked) chars += symbols;
    if (chars === '') chars = lowercase;
    
    let password = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        password += chars[array[i] % chars.length];
    }
    passwordResult.value = password;
}

if (generatePassword) {
    generatePassword.addEventListener('click', generatePasswordFunc);
}

if (copyPassword) {
    copyPassword.addEventListener('click', () => {
        if (passwordResult.value) {
            copyToClipboard(passwordResult.value);
            showToast('Пароль скопирован!');
        }
    });
}

// ============================================
// BASE64 TOOL
// ============================================
const base64Input = document.getElementById('base64-input');
const base64Output = document.getElementById('base64-output');
const base64Encode = document.getElementById('base64-encode');
const base64Decode = document.getElementById('base64-decode');

if (base64Encode) {
    base64Encode.addEventListener('click', () => {
        try {
            base64Output.value = btoa(base64Input.value);
        } catch (e) {
            base64Output.value = 'Ошибка: Некорректный ввод';
        }
    });
}

if (base64Decode) {
    base64Decode.addEventListener('click', () => {
        try {
            base64Output.value = atob(base64Input.value);
        } catch (e) {
            base64Output.value = 'Ошибка: Некорректный Base64';
        }
    });
}

// ============================================
// RANDOM NUMBER
// ============================================
const randomMin = document.getElementById('random-min');
const randomMax = document.getElementById('random-max');
const generateRandom = document.getElementById('generate-random');
const randomResult = document.getElementById('random-result');

if (generateRandom) {
    generateRandom.addEventListener('click', () => {
        const min = parseInt(randomMin.value) || 1;
        const max = parseInt(randomMax.value) || 100;
        if (min >= max) {
            randomResult.textContent = 'Мин должно быть меньше Макс';
            return;
        }
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const random = Math.floor((array[0] / (0xFFFFFFFF + 1)) * (max - min + 1)) + min;
        randomResult.textContent = random;
    });
}

// ============================================
// JSON FORMATTER
// ============================================
const jsonInput = document.getElementById('json-input');
const jsonOutput = document.getElementById('json-output');
const jsonFormat = document.getElementById('json-format');
const jsonMinify = document.getElementById('json-minify');
const jsonValidate = document.getElementById('json-validate');
const jsonStatus = document.getElementById('json-status');

if (jsonFormat) {
    jsonFormat.addEventListener('click', () => {
        try {
            const obj = JSON.parse(jsonInput.value);
            jsonOutput.value = JSON.stringify(obj, null, 2);
            jsonStatus.className = 'validation-status success';
            jsonStatus.textContent = '✓ Корректный JSON';
        } catch (e) {
            jsonStatus.className = 'validation-status error';
            jsonStatus.textContent = '✗ Некорректный JSON: ' + e.message;
        }
    });
}

if (jsonMinify) {
    jsonMinify.addEventListener('click', () => {
        try {
            const obj = JSON.parse(jsonInput.value);
            jsonOutput.value = JSON.stringify(obj);
            jsonStatus.className = 'validation-status success';
            jsonStatus.textContent = '✓ Корректный JSON';
        } catch (e) {
            jsonStatus.className = 'validation-status error';
            jsonStatus.textContent = '✗ Некорректный JSON: ' + e.message;
        }
    });
}

if (jsonValidate) {
    jsonValidate.addEventListener('click', () => {
        try {
            JSON.parse(jsonInput.value);
            jsonStatus.className = 'validation-status success';
            jsonStatus.textContent = '✓ Корректный JSON';
        } catch (e) {
            jsonStatus.className = 'validation-status error';
            jsonStatus.textContent = '✗ Некорректный JSON: ' + e.message;
        }
    });
}

// ============================================
// UUID GENERATOR
// ============================================
const uuidResult = document.getElementById('uuid-result');
const generateUuid = document.getElementById('generate-uuid');
const copyUuid = document.getElementById('copy-uuid');
const uuidCount = document.getElementById('uuid-count');

if (generateUuid) {
    generateUuid.addEventListener('click', () => {
        const count = parseInt(uuidCount.value) || 1;
        const uuids = [];
        for (let i = 0; i < count; i++) {
            if (crypto.randomUUID) {
                uuids.push(crypto.randomUUID());
            } else {
                uuids.push('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                }));
            }
        }
        uuidResult.value = uuids.join('\n');
    });
}

if (copyUuid) {
    copyUuid.addEventListener('click', () => {
        if (uuidResult.value) {
            copyToClipboard(uuidResult.value);
            showToast('UUID скопирован!');
        }
    });
}

// ============================================
// HASH GENERATOR
// ============================================
const hashInput = document.getElementById('hash-input');
const hashAlgorithm = document.getElementById('hash-algorithm');
const generateHash = document.getElementById('generate-hash');
const hashResult = document.getElementById('hash-result');

if (generateHash) {
    generateHash.addEventListener('click', async () => {
        if (!hashInput.value) {
            hashResult.textContent = 'Введите текст для хеширования';
            return;
        }
        const algorithm = hashAlgorithm.value;
        const encoder = new TextEncoder();
        const data = encoder.encode(hashInput.value);
        try {
            let hashBuffer;
            if (algorithm === 'MD5') {
                hashResult.textContent = await simpleMD5(hashInput.value);
                return;
            } else {
                hashBuffer = await crypto.subtle.digest(algorithm, data);
            }
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            hashResult.textContent = hashHex;
        } catch (e) {
            hashResult.textContent = 'Ошибка: ' + e.message;
        }
    });
}

async function simpleMD5(message) {
    function rotateLeft(value, shift) { return (value << shift) | (value >>> (32 - shift)); }
    function addUnsigned(x, y) {
        const lsw = (x & 0xFFFF) + (y & 0xFFFF);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }
    function FF(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function GG(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function HH(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function II(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function convertToWordArray(str) {
        const lWordCount = ((str.length + 8 - ((str.length + 8) % 64)) / 4) + 2;
        const lWordArray = new Array(lWordCount - 1);
        let lBytePosition = 0, lByteCount = 0;
        while (lByteCount < str.length) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lWordArray.length - 2] = str.length << 3;
        lWordArray[lWordArray.length - 1] = str.length >>> 29;
        return lWordArray;
    }
    function wordToHex(str) {
        let wordToHexValue = '', wordToHexValueTemp = '', lByte, lCount;
        for (lCount = 0; lCount <= str.length - 1; lCount++) {
            lByte = (str.charCodeAt(lCount) >> 8) & 0xFF;
            wordToHexValueTemp += '0' + lByte.toString(16);
            wordToHexValueTemp = wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2);
        }
        return wordToHexValueTemp;
    }
    const x = convertToWordArray(message);
    let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;
    for (let k = 0; k < x.length; k += 16) {
        const AA = a, BB = b, CC = c, DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
        d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
        c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
        b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
        a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
        d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
        c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
        b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
        a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
        d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
        c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
        b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
        a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
        d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
        c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
        b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
        a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
        d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
        c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
        b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
        a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
        d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
        c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
        b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
        a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
        d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
        c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
        b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
        a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
        d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
        c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
        b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
        a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
        d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
        c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
        b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
        a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
        d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
        c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
        b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
        a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
        d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
        c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
        b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
        a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
        d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
        c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
        b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
        a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
        d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
        c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
        b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
        a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
        d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
        c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
        b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
        a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
        d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
        c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
        b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
        a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
        d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
        c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
        b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
        a = addUnsigned(a, AA);
        b = addUnsigned(b, BB);
        c = addUnsigned(c, CC);
        d = addUnsigned(d, DD);
    }
    const temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
    return temp.toLowerCase();
}

// ============================================
// QR GENERATOR
// ============================================
const qrInput = document.getElementById('qr-input');
const generateQr = document.getElementById('generate-qr');
const downloadQr = document.getElementById('download-qr');
const qrCodeContainer = document.getElementById('qr-code');

if (generateQr) {
    generateQr.addEventListener('click', () => {
        if (!qrInput.value) {
            alert('Введите текст или URL');
            return;
        }
        qrCodeContainer.innerHTML = '';
        new QRCode(qrCodeContainer, {
            text: qrInput.value,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        downloadQr.style.display = 'inline-flex';
    });
}

if (downloadQr) {
    downloadQr.addEventListener('click', () => {
        const canvas = qrCodeContainer.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    });
}

// ============================================
// COLOR CONVERTER
// ============================================
const colorPicker = document.getElementById('color-picker');
const colorHex = document.getElementById('color-hex');
const colorRgb = document.getElementById('color-rgb');
const colorHsl = document.getElementById('color-hsl');

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function updateColorFormats() {
    if (!colorPicker) return;
    const hex = colorPicker.value;
    colorHex.value = hex;
    const rgb = hexToRgb(hex);
    if (rgb) {
        colorRgb.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        colorHsl.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }
}

if (colorPicker) {
    colorPicker.addEventListener('input', updateColorFormats);
    updateColorFormats();
}

// ============================================
// TIMESTAMP CONVERTER
// ============================================
const timestampInput = document.getElementById('timestamp-input');
const dateInput = document.getElementById('date-input');
const timestampToDate = document.getElementById('timestamp-to-date');
const dateToTimestamp = document.getElementById('date-to-timestamp');
const timestampResult = document.getElementById('timestamp-result');

if (timestampToDate) {
    timestampToDate.addEventListener('click', () => {
        const timestamp = parseInt(timestampInput.value);
        if (timestamp) {
            const date = new Date(timestamp * 1000);
            timestampResult.textContent = date.toLocaleString('ru-RU');
        } else {
            timestampResult.textContent = 'Введите корректную временную метку';
        }
    });
}

if (dateToTimestamp) {
    dateToTimestamp.addEventListener('click', () => {
        if (dateInput.value) {
            const date = new Date(dateInput.value);
            const timestamp = Math.floor(date.getTime() / 1000);
            timestampResult.textContent = timestamp;
        } else {
            timestampResult.textContent = 'Выберите дату';
        }
    });
}

if (dateInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateInput.value = now.toISOString().slice(0, 16);
}

// ============================================
// TEXT UPPERCASE
// ============================================
const uppercaseInput = document.getElementById('uppercase-input');
const uppercaseOutput = document.getElementById('uppercase-output');
const convertUppercase = document.getElementById('convert-uppercase');
const copyUppercase = document.getElementById('copy-uppercase');

if (convertUppercase) {
    convertUppercase.addEventListener('click', () => {
        uppercaseOutput.value = uppercaseInput.value.toUpperCase();
    });
}

if (copyUppercase) {
    copyUppercase.addEventListener('click', () => {
        if (uppercaseOutput.value) {
            copyToClipboard(uppercaseOutput.value);
            showToast('Текст скопирован!');
        }
    });
}

// ============================================
// TEXT LOWERCASE
// ============================================
const lowercaseInput = document.getElementById('lowercase-input');
const lowercaseOutput = document.getElementById('lowercase-output');
const convertLowercase = document.getElementById('convert-lowercase');
const copyLowercase = document.getElementById('copy-lowercase');

if (convertLowercase) {
    convertLowercase.addEventListener('click', () => {
        lowercaseOutput.value = lowercaseInput.value.toLowerCase();
    });
}

if (copyLowercase) {
    copyLowercase.addEventListener('click', () => {
        if (lowercaseOutput.value) {
            copyToClipboard(lowercaseOutput.value);
            showToast('Текст скопирован!');
        }
    });
}

// ============================================
// REMOVE SPACES
// ============================================
const spacesInput = document.getElementById('spaces-input');
const spacesOutput = document.getElementById('spaces-output');
const removeSpaces = document.getElementById('remove-spaces');
const copySpaces = document.getElementById('copy-spaces');

if (removeSpaces) {
    removeSpaces.addEventListener('click', () => {
        spacesOutput.value = spacesInput.value.replace(/\s+/g, '');
    });
}

if (copySpaces) {
    copySpaces.addEventListener('click', () => {
        if (spacesOutput.value) {
            copyToClipboard(spacesOutput.value);
            showToast('Текст скопирован!');
        }
    });
}

// ============================================
// URL ENCODER
// ============================================
const urlEncoderInput = document.getElementById('url-encoder-input');
const urlEncoderOutput = document.getElementById('url-encoder-output');
const encodeUrl = document.getElementById('encode-url');
const copyEncoder = document.getElementById('copy-encoder');

if (encodeUrl) {
    encodeUrl.addEventListener('click', () => {
        urlEncoderOutput.value = encodeURIComponent(urlEncoderInput.value);
    });
}

if (copyEncoder) {
    copyEncoder.addEventListener('click', () => {
        if (urlEncoderOutput.value) {
            copyToClipboard(urlEncoderOutput.value);
            showToast('URL скопирован!');
        }
    });
}

// ============================================
// URL DECODER
// ============================================
const urlDecoderInput = document.getElementById('url-decoder-input');
const urlDecoderOutput = document.getElementById('url-decoder-output');
const decodeUrl = document.getElementById('decode-url');
const copyDecoder = document.getElementById('copy-decoder');

if (decodeUrl) {
    decodeUrl.addEventListener('click', () => {
        try {
            urlDecoderOutput.value = decodeURIComponent(urlDecoderInput.value);
        } catch (e) {
            urlDecoderOutput.value = 'Ошибка: Некорректный URL';
        }
    });
}

if (copyDecoder) {
    copyDecoder.addEventListener('click', () => {
        if (urlDecoderOutput.value) {
            copyToClipboard(urlDecoderOutput.value);
            showToast('URL скопирован!');
        }
    });
}

console.log('ToolHub Инструменты инициализированы');