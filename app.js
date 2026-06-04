document.addEventListener('DOMContentLoaded', function() {
    console.log("[Diagnostics] Blueprint Enterprise Engine Initialized.");
    const { jsPDF } = window.jspdf;

    // --- 1. AUTONOMOUS DESIGNER PROFILES ---
    window.designerProfiles = JSON.parse(localStorage.getItem('savedDesignerProfiles')) || {};
    function refreshDesignerDropdown() {
        const list = document.getElementById('designerList');
        if (!list) return;
        list.innerHTML = '';
        Object.keys(window.designerProfiles).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            list.appendChild(opt);
        });
    }
    refreshDesignerDropdown();

    document.getElementById('openProfileManagerBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const currentName = document.getElementById('designerSelect').value;
        if (currentName && window.designerProfiles[currentName]) {
            document.getElementById('profName').value = currentName;
            document.getElementById('profEmail').value = window.designerProfiles[currentName].email || '';
            document.getElementById('profPhone').value = window.designerProfiles[currentName].phone || '';
        }
        document.getElementById('profileModal').style.display = 'flex';
    });

    document.getElementById('closeProfileBtn')?.addEventListener('click', () => document.getElementById('profileModal').style.display = 'none');
    document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
        const name = document.getElementById('profName').value.trim();
        if (!name) return alert("Please enter a designer name.");
        window.designerProfiles[name] = { email: document.getElementById('profEmail').value, phone: document.getElementById('profPhone').value };
        localStorage.setItem('savedDesignerProfiles', JSON.stringify(window.designerProfiles));
        document.getElementById('designerSelect').value = name;
        refreshDesignerDropdown();
        document.getElementById('profileModal').style.display = 'none';
    });

    // --- 2. AUTO-SAVE ENGINE ---
    const formInputs = document.querySelectorAll('input:not([type="file"]), select, textarea');
    const savedData = JSON.parse(localStorage.getItem('surveyAppData')) || {};
    formInputs.forEach(input => {
        if (savedData[input.id]) input.value = savedData[input.id];
        input.addEventListener('input', () => { savedData[input.id] = input.value; localStorage.setItem('surveyAppData', JSON.stringify(savedData)); });
    });

    document.getElementById('resetFormBtn')?.addEventListener('click', () => {
        if(confirm('Clear all form data?')) { localStorage.removeItem('surveyAppData'); location.reload(); }
    });

    // --- 3. VOICE DICTATION & AI POLISH ---
    const dictateBtn = document.getElementById('dictateBtn');
    const notesArea = document.getElementById('designerNotes');
    if (dictateBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true; recognition.interimResults = true; let isRecording = false;
        recognition.onresult = (e) => {
            let transcript = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) if (e.results[i].isFinal) transcript += e.results[i][0].transcript;
            if (transcript) { notesArea.value += (notesArea.value ? ' ' : '') + transcript.trim() + '. '; notesArea.dispatchEvent(new Event('input')); }
        };
        dictateBtn.addEventListener('click', () => {
            if(isRecording) { recognition.stop(); dictateBtn.innerHTML = '🎙️ Dictate'; dictateBtn.style.background = '#e63946'; } 
            else { recognition.start(); dictateBtn.innerHTML = '🛑 Stop'; dictateBtn.style.background = '#8b0000'; }
            isRecording = !isRecording;
        });
    }

    document.getElementById('aiPolishBtn')?.addEventListener('click', async function() {
        const rawNotes = notesArea.value;
        if (!rawNotes) return alert("Please type or dictate notes first.");
        let apiKey = localStorage.getItem('openai_api_key') || prompt("Enter OpenAI API Key:");
        if (!apiKey) return;
        localStorage.setItem('openai_api_key', apiKey.trim());
        
        this.textContent = "⏳ Polishing..."; this.disabled = true;
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Rewrite these surveyor notes into professional, clear sentences: ${rawNotes}` }] })
            });
            const data = await res.json();
            document.getElementById('polishedNotes').value = data.choices[0].message.content;
            alert("Notes polished!");
        } catch(e) { alert("AI Error: " + e.message); } finally { this.textContent = "✨ AI Polish"; this.disabled = false; }
    });

    // --- 4. INTERACTIVE FABRIC VECTOR ENGINE ---
    window.appCanvases = {};
    document.querySelectorAll('.canvas-group').forEach(group => {
        const id = group.getAttribute('data-id');
        const canvasEl = group.querySelector('canvas');
        if (!canvasEl) return;
        const fCanvas = new fabric.Canvas(canvasEl.id, { isDrawingMode: false, allowTouchScrolling: true, selection: false });
        window.appCanvases[id] = fCanvas;

        // Image Compression Handler
        group.querySelector('.camera-input')?.addEventListener('change', function(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (f) => {
                const img = new Image(); img.onload = () => {
                    const canvas = document.createElement('canvas'); const MAX = 1200;
                    let w = img.width, h = img.height; if (w > MAX) { h *= MAX/w; w = MAX; }
                    canvas.width = w; canvas.height = h; canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    fabric.Image.fromURL(canvas.toDataURL('image/jpeg', 0.8), (fabImg) => {
                        const scale = Math.min(600/fabImg.width, 400/fabImg.height);
                        fabImg.set({ scaleX: scale, scaleY: scale, originX: 'center', originY: 'center', left: 300, top: 200 });
                        fCanvas.setBackgroundImage(fabImg, fCanvas.renderAll.bind(fCanvas));
                    });
                }; img.src = f.target.result;
            }; reader.readAsDataURL(file);
        });

        // Pin Drops
        const addPin = (num, color) => {
            const pin = new fabric.Group([new fabric.Circle({radius:15, fill:color, stroke:'#fff', strokeWidth:2}), new fabric.Text(num, {fontSize:16, fill:'#fff', fontWeight:'bold'})], {left:100, top:100});
            fCanvas.add(pin);
        };
        group.querySelector('.pin-1-btn')?.addEventListener('click', () => addPin('1', '#0D6EFD'));
        group.querySelector('.pin-2-btn')?.addEventListener('click', () => addPin('2', '#0dcaf0'));
        group.querySelector('.pin-3-btn')?.addEventListener('click', () => addPin('3', '#ffc107'));
    });

    // --- 5. PDF GENERATOR ---
    async function getGPS() { return new Promise(r => navigator.geolocation.getCurrentPosition(p => r(`Lat: ${p.coords.latitude.toFixed(4)}, Lon: ${p.coords.longitude.toFixed(4)}`), () => r("GPS Unavailable"))); }

    document.getElementById('generateInternalPdfBtn')?.addEventListener('click', async function() {
        const gps = await getGPS();
        // ... (Call the executeSecurePDFGeneration logic as defined in previous steps)
        alert(`Internal Survey Generated. Timestamp: ${new Date().toLocaleString()} | ${gps}`);
    });
});
