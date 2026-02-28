const startBtn = document.getElementById('startBtn');
const imageInput = document.getElementById('imageInput');
const outputArea = document.getElementById('outputArea');
const status = document.getElementById('status');

startBtn.addEventListener('click', async () => {
    if (!imageInput.files[0]) return alert("Please select an image!");

    status.innerText = "Status: Processing Devanagari Script...";
    
    // Initialize Tesseract with Hindi (hin) for Devanagari script
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

function updateStatistics(text) {
    // 1. Clean the text: Remove punctuation marks and special symbols
    // This regex replaces commas, dots, exclamation marks, and the Purna Viram (।) with nothing
    const cleanText = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?!]/g, "");

    // 2. Word Count: Split by spaces and filter out empty strings
    const words = cleanText.trim().split(/\s+/).filter(w => w.length > 0);

    // 3. Sentence Count: Split by traditional and modern end-marks
    const sentences = text.split(/[।|!|?|\.]/).filter(s => s.trim().length > 0);

    // 4. Character Count: Length of the raw text (or use cleanText if you prefer)
    const charCount = text.length;

    // 5. Average Word Length
    const totalCharsInWords = words.reduce((acc, word) => acc + word.length, 0);
    const avgLen = words.length > 0 ? (totalCharsInWords / words.length).toFixed(2) : 0;

    // Update the UI
    document.getElementById('wordCount').innerText = words.length;
    document.getElementById('sentenceCount').innerText = sentences.length;
    document.getElementById('charCount').innerText = charCount;
    document.getElementById('avgWord').innerText = avgLen;
}
// Download function
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
});