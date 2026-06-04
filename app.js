document.addEventListener('DOMContentLoaded', function() {
    console.log("[Diagnostics] Blueprint Enterprise Engine Initialized.");
    const { jsPDF } = window.jspdf;

    // --- GLOBAL CONFIG ---
    window.brandLogos = { "Yorkshire Windows": "logo.jpg", "Clearview": "logo.jpg", "CO Home Improvements": "logo.jpg" };

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

    // --- 2. AUTO-SAVE & AI ENGINE ---
    const formInputs = document.querySelectorAll('input:not([type="file"]), select, textarea');
    const savedData = JSON.parse(localStorage.getItem('surveyAppData')) || {};
    formInputs.forEach(input => {
        if (savedData[input.id]) input.value = savedData[input.id];
        input.addEventListener('input', () => { savedData[input.id] = input.value; localStorage.setItem('surveyAppData', JSON.stringify(savedData)); });
    });

    document.getElementById('aiPolishBtn')?.addEventListener('click', async function() {
        const rawNotes = document.getElementById('designerNotes').value;
        if (!rawNotes) return alert("Type or dictate notes first.");
        let apiKey = localStorage.getItem('openai_api_key') || prompt("Enter OpenAI API Key:");
        if (!apiKey) return;
        localStorage.setItem('openai_api_key', apiKey.trim());
        
        this.textContent = "⏳ Polishing..."; this.disabled = true;
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Rewrite these notes into professional sentences: ${rawNotes}` }] })
            });
            const data = await res.json();
            document.getElementById('polishedNotes').value = data.choices[0].message.content;
            alert("Notes polished!");
        } catch(e) { alert("AI Error: " + e.message); localStorage.removeItem('openai_api_key'); } finally { this.textContent = "✨ AI Polish"; this.disabled = false; }
    });

    // --- 3. PDF GENERATION ENGINE ---
    async function getGPS() { return new Promise(r => navigator.geolocation.getCurrentPosition(p => r(`Lat: ${p.coords.latitude.toFixed(4)}, Lon: ${p.coords.longitude.toFixed(4)}`), () => r("GPS Unavailable"))); }

    async function executeSecurePDFGeneration(templateId, fileName, btn, data) {
        btn.disabled = true; btn.innerText = "Generating PDF...";
        const template = document.getElementById(templateId);
        template.style.display = 'block';
        
        const canvas = await html2canvas(template, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.addImage(imgData, 'JPEG', 10, 10, 190, (canvas.height * 190) / canvas.width);
        doc.save(fileName);
        
        template.style.display = 'none';
        btn.disabled = false; btn.innerText = "PDF Ready";
    }

    document.getElementById('generateInternalPdfBtn')?.addEventListener('click', async function() {
        const gps = await getGPS();
        document.getElementById('pdfGpsTimestamp').innerText = gps;
        executeSecurePDFGeneration('pdfTemplateInternal', 'Internal_Survey.pdf', this, {});
    });

    document.getElementById('generateCustomerPdfBtn')?.addEventListener('click', async function() {
        executeSecurePDFGeneration('pdfTemplateCustomer', 'Customer_Pack.pdf', this, {});
    });
});
