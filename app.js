document.addEventListener('DOMContentLoaded', function() {
    console.log("[Diagnostics] Blueprint Enterprise Engine Initialized (Core Version).");
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
    formInputs.forEach(input => {
        const savedData = JSON.parse(localStorage.getItem('surveyAppData')) || {};
        if (savedData[input.id]) input.value = savedData[input.id];
        input.addEventListener('input', () => { 
            const currentData = JSON.parse(localStorage.getItem('surveyAppData')) || {};
            currentData[input.id] = input.value; 
            localStorage.setItem('surveyAppData', JSON.stringify(currentData)); 
        });
    });

    // --- 3. INTERACTIVE FABRIC VECTOR ENGINE + COMPRESSION ---
    window.appCanvases = {};
    document.querySelectorAll('.canvas-group').forEach(group => {
        const id = group.getAttribute('data-id');
        const canvasEl = group.querySelector('canvas');
        if (!canvasEl) return;
        const fCanvas = new fabric.Canvas(canvasEl.id, { isDrawingMode: false, allowTouchScrolling: true, selection: false });
        window.appCanvases[id] = fCanvas;

        group.querySelector('.camera-input')?.addEventListener('change', function(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (f) => {
                const img = new Image(); img.onload = () => {
                    const canvas = document.createElement('canvas'); const MAX = 1000;
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

        const addPin = (num, color) => {
            const pin = new fabric.Group([new fabric.Circle({radius:15, fill:color, stroke:'#fff', strokeWidth:2}), new fabric.Text(num, {fontSize:16, fill:'#fff', fontWeight:'bold'})], {left:100, top:100});
            fCanvas.add(pin);
        };
        group.querySelector('.pin-1-btn')?.addEventListener('click', () => addPin('1', '#0D6EFD'));
        group.querySelector('.pin-2-btn')?.addEventListener('click', () => addPin('2', '#0dcaf0'));
        group.querySelector('.pin-3-btn')?.addEventListener('click', () => addPin('3', '#ffc107'));
    });

    // --- 4. RELIABLE PDF GENERATOR ---
    async function generatePDF(templateId, filename, btn) {
        btn.disabled = true; btn.innerText = "Processing PDF...";
        const template = document.getElementById(templateId);
        template.style.display = 'block';
        try {
            const canvas = await html2canvas(template, { scale: 1.5, useCORS: true });
            const doc = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            doc.addImage(imgData, 'JPEG', 10, 10, 190, (canvas.height * 190) / canvas.width);
            doc.save(filename);
        } catch(e) { alert("PDF Error: " + e.message); }
        template.style.display = 'none';
        btn.disabled = false; btn.innerText = btn.id === 'generateInternalPdfBtn' ? 'Full Survey PDF' : 'Customer Checklist PDF';
    }

    document.getElementById('generateInternalPdfBtn')?.addEventListener('click', function() { generatePDF('pdfTemplateInternal', 'Internal_Survey.pdf', this); });
    document.getElementById('generateCustomerPdfBtn')?.addEventListener('click', function() { generatePDF('pdfTemplateCustomer', 'Customer_Pack.pdf', this); });
});
