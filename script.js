const startBtn = document.getElementById('startBtn');
const imageInput = document.getElementById('imageInput');
const outputArea = document.getElementById('outputArea');
const status = document.getElementById('status');

// --- OCR LOGIC ---
startBtn.addEventListener('click', async () => {
    if (!imageInput.files[0]) return alert("Please select an image!");

    status.innerText = "Status: Processing Devanagari Script...";
    const worker = await Tesseract.createWorker('hin'); 
    
    try {
        const { data: { text } } = await worker.recognize(imageInput.files[0]);
        outputArea.value = text;
        updateStatistics(text);
        status.innerText = "Status: Recognition Complete!";
    } catch (error) {
        status.innerText = "Status: Error occurred.";
        console.error(error);
    }
    await worker.terminate();
});

// --- STATISTICS LOGIC ---
function updateStatistics(text) {
    const cleanText = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?!]/g, "");
    const words = cleanText.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[।|!|?|\.]/).filter(s => s.trim().length > 0);
    const charCount = text.length;
    const totalCharsInWords = words.reduce((acc, word) => acc + word.length, 0);
    const avgLen = words.length > 0 ? (totalCharsInWords / words.length).toFixed(2) : 0;

    document.getElementById('wordCount').innerText = words.length;
    document.getElementById('sentenceCount').innerText = sentences.length;
    document.getElementById('charCount').innerText = charCount;
    document.getElementById('avgWord').innerText = avgLen;
}

// --- DOWNLOAD LOGIC ---
document.getElementById('downloadBtn').addEventListener('click', () => {
    const text = outputArea.value;
    const doc = new docx.Document({
        sections: [{
            children: [new docx.Paragraph(text)],
        }],
    });
    docx.Packer.toBlob(doc).then(blob => {
        saveAs(blob, "Rajasthani_Text.docx");
    });
}); // <--- Fixed: Added missing closing brace here

// --- DISTANCE ALGORITHMS ---
function getHamming(s1, s2) {
    if (s1.length !== s2.length) return "N/A";
    let distance = 0;
    for (let i = 0; i < s1.length; i++) {
        if (s1[i] !== s2[i]) distance++;
    }
    return distance;
}

function getLevenshtein(s1, s2) {
    const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(track[j][i - 1] + 1, track[j - 1][i] + 1, track[j - 1][i - 1] + indicator);
        }
    }
    return track[s2.length][s1.length];
}

function getLCS(s1, s2) {
    const dp = Array(s1.length + 1).fill(0).map(() => Array(s2.length + 1).fill(0));
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[s1.length][s2.length];
}

function getJaro(s1, s2) {
    if (s1 === s2) return 1.0;
    let len1 = s1.length, len2 = s2.length;
    let max_dist = Math.floor(Math.max(len1, len2) / 2) - 1;
    let match = 0, hash_s1 = Array(len1).fill(0), hash_s2 = Array(len2).fill(0);
    for (let i = 0; i < len1; i++) {
        for (let j = Math.max(0, i - max_dist); j < Math.min(len2, i + max_dist + 1); j++)
            if (s1[i] == s2[j] && hash_s2[j] == 0) { hash_s1[i] = 1; hash_s2[j] = 1; match++; break; }
    }
    if (match == 0) return 0.0;
    let t = 0, point = 0;
    for (let i = 0; i < len1; i++) {
        if (hash_s1[i]) {
            while (hash_s2[point] == 0) point++;
            if (s1[i] != s2[point++]) t++;
        }
    }
    return ((match / len1 + match / len2 + (match - t / 2) / match) / 3).toFixed(2);
}

let dictionary = [];

// Load the Rajasthani dictionary from JSON
async function loadDictionary() {
    try {
        const response = await fetch('dictionary.json');
        dictionary = await response.json();
        console.log("Rajasthani Dictionary Loaded: " + dictionary.length + " words.");
    } catch (err) {
        console.error("Could not load JSON. Check if file name is correct.");
        // Fallback list just in case
        dictionary = ["खम्मा", "घणी", "राजस्थान"]; 
    }
}

// Call this immediately
loadDictionary();
document.getElementById('spellCheckBtn').addEventListener('click', () => {
    const text = document.getElementById('outputArea').value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const tableBody = document.getElementById('tableBody');
    
    tableBody.innerHTML = ""; 
    document.getElementById('spellResults').style.display = "block";

    words.forEach(ocrWord => {
        let benchmark = "Wrong";
        let displayWord = ocrWord;
        let bestMatch = dictionary[0];
        let minDistance = Infinity;

        // 1. Exact Match Check
        let exactMatch = dictionary.find(dictWord => dictWord === ocrWord);

        if (exactMatch) {
            benchmark = "Correct";
            bestMatch = exactMatch;
        } else {
            // 2. Backoff Strategy
            for (let i = ocrWord.length - 1; i >= 2; i--) {
                let segment = ocrWord.substring(0, i);
                if (dictionary.includes(segment)) {
                    benchmark = "Partial";
                    displayWord = `<span class="root-highlight" style="background:#dff0d8">${segment}</span>+${ocrWord.substring(i)}`;
                    bestMatch = segment;
                    break;
                }
            }
        }

        if (benchmark === "Wrong") {
            dictionary.forEach(dictWord => {
                let d = getLevenshtein(ocrWord, dictWord);
                if (d < minDistance) { minDistance = d; bestMatch = dictWord; }
            });
        }

        const row = `
            <tr>
                <td>${displayWord}</td>
                <td>${getHamming(ocrWord, bestMatch)}</td>
                <td>${getLCS(ocrWord, bestMatch)}</td>
                <td>${getLevenshtein(ocrWord, bestMatch)}</td>
                <td>${getJaro(ocrWord, bestMatch)}</td>
                <td style="color: ${benchmark === 'Correct' ? 'green' : (benchmark === 'Partial' ? 'orange' : 'red')}">
                    ${benchmark}
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
});