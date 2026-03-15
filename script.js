// Variable Declarations
const imageInput = document.getElementById('imageInput');
const startBtn = document.getElementById('startBtn');
const outputArea = document.getElementById('outputArea');
const status = document.getElementById('status');
const clearBtn = document.getElementById('clearBtn');
const spellCheckBtn = document.getElementById('spellCheckBtn');
const downloadBtn = document.getElementById('downloadBtn');

let dictionary = [];

// Image Preview
imageInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.style.display = "block";
            document.getElementById('previewPlaceholder').style.display = "none";
        };
        reader.readAsDataURL(file);
    }
});

// Load Dictionary
async function loadDict() {
    try {
        const resp = await fetch('dictionary.json');
        dictionary = await resp.json();
    } catch(e) { 
        dictionary = ["खम्मा", "राजस्थान"]; 
    }
}
loadDict();

// OCR Process
startBtn.addEventListener('click', async () => {
    if (!imageInput.files[0]) return alert("Select an image!");
    status.innerText = "Processing...";
    const worker = await Tesseract.createWorker('hin');
    const { data: { text } } = await worker.recognize(imageInput.files[0]);
    outputArea.value = text;
    updateStatistics(text);
    status.innerText = "Complete!";
    await worker.terminate();
});

// Statistics
function updateStatistics(text) {
    const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?!]/g, "");
    const words = clean.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[।|.!?]/).filter(s => s.trim().length > 0);
    
    document.getElementById('wordCount').innerText = words.length;
    document.getElementById('sentenceCount').innerText = sentences.length;
    document.getElementById('charCount').innerText = text.length;
    document.getElementById('avgWord').innerText = words.length > 0 ? (words.join('').length / words.length).toFixed(2) : 0;
}

// Distance Functions (Standard Algorithms)
function getLevenshtein(s1, s2) {
    const m = s1.length, n = s2.length;
    const d = Array.from({length: m+1}, (_,i) => [i]);
    for (let j=1; j<=n; j++) d[0][j] = j;
    for (let i=1; i<=m; i++) {
        for (let j=1; j<=n; j++) {
            const cost = s1[i-1] === s2[j-1] ? 0 : 1;
            d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+cost);
        }
    }
    return d[m][n];
}

// Spell Check Button Logic
spellCheckBtn.addEventListener('click', () => {
    const words = outputArea.value.trim().split(/\s+/);
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = "";
    document.getElementById('spellResults').style.display = "block";

    words.forEach(w => {
        let bestMatch = dictionary[0] || "";
        let minD = 999;
        
        dictionary.forEach(d => {
            let dist = getLevenshtein(w, d);
            if(dist < minD) { minD = dist; bestMatch = d; }
        });

        tableBody.innerHTML += `<tr><td>${w}</td><td>-</td><td>-</td><td>${minD}</td><td>-</td><td>${minD===0?'Correct':'Wrong'}</td></tr>`;
    });
});

// Clear All
clearBtn.addEventListener('click', () => location.reload());