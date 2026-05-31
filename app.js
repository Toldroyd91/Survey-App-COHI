document.addEventListener('DOMContentLoaded', function() {
    console.log("[Diagnostics] Enterprise Engine Started. Loading modules...");

    const { jsPDF } = window.jspdf;

    // ==========================================
    // 1. DIGITAL DICTIONARIES
    // ==========================================
    const designerProfiles = {
        "Tom": { phone: "07700 900000", email: "tom@cohi.co.uk", defaultBrand: "Yorkshire Windows", bio: "Thank you for welcoming me into your home today. Over the next 48 hours, I will be passing these precise measurements to our architectural team to generate your 3D visual renders and structural quote." },
        "Sobaan": { phone: "07700 900001", email: "sobaan@cohi.co.uk", defaultBrand: "CO Home Improvements", bio: "It was a pleasure meeting you to discuss your new living space. I am now compiling your technical requirements to generate a comprehensive, bespoke quotation and design mockup." },
        "James": { phone: "07700 900002", email: "james@cohi.co.uk", defaultBrand: "CO Home Improvements", bio: "Thank you for your time today. I am personally overseeing the initial design phase of your project. We will have your custom 3D concepts and pricing structure ready for review shortly." }
    };

    const brandLogos = {
        "Clearview": "clearview.png", "CO Home Improvements": "logo.jpg", "Orion Windows": "orion.png",
        "Planet": "planet.png", "Trent Valley Windows": "trentvalley.png", "West Yorkshire Windows": "westyorkshire.png",
        "Yorkshire Windows": "yorkshire.png"
    };

    const designerSelect = document.getElementById('designerSelect');
    const brandSelect = document.getElementById('brandSelect');
    if(designerSelect && brandSelect) {
        designerSelect.addEventListener('change', (e) => {
            const name = e.target.value;
            if(designerProfiles[name]) brandSelect.value = designerProfiles[name].defaultBrand;
        });
    }

    // ==========================================
    // 2. AUTO-SAVE & CANVAS ENGINE
    // ==========================================
    const inputsToSave = document.querySelectorAll('input:not([type="file"]), textarea, select');
    const savedData = JSON.parse(localStorage.getItem('surveyAppData')) || {};
    inputsToSave.forEach(input => {
        if (savedData[input.id]) input.value = savedData[input.id];
        input.addEventListener('input', () => { savedData[input.id] = input.value; localStorage.setItem('surveyAppData', JSON.stringify(savedData)); });
    });

    window.appCanvases = {};
    document.querySelectorAll('.canvas-group').forEach(group => {
        const id = group.getAttribute('data-id');
        const canvasEl = group.querySelector('canvas');
        if (!canvasEl) return;
        const fCanvas = new fabric.Canvas(canvasEl.id, { isDrawingMode: false });
        fCanvas.freeDrawingBrush.color = '#FF0000';
        fCanvas.freeDrawingBrush.width = 4;
        window.appCanvases[id] = fCanvas;
    });

    // ==========================================
    // 3. ENTERPRISE PDF RENDER ENGINE
    // ==========================================
    async function loadImagesInGrid(gridId, inputId) {
        const grid = document.getElementById(gridId);
        const input = document.getElementById(inputId);
        if(!grid || !input || input.files.length === 0) return;
        grid.innerHTML = '';
        const promises = Array.from(input.files).map(file => new Promise(resolve => {
            const img = document.createElement('img');
            img.crossOrigin = "anonymous";
            img.src = URL.createObjectURL(file);
            img.onload = () => { grid.appendChild(img); resolve(); };
            img.onerror = resolve;
        }));
        await Promise.all(promises);
    }

    async function executeSecurePDFGeneration(templateId, fileName, btn) {
        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerText = "Initializing Engine...";

        const template = document.getElementById(templateId);
        const mainApp = document.querySelector('main');
        
        // Mobile Viewport Fix
        const oldW = document.body.style.width;
        document.body.style.width = '800px';
        template.style.display = 'block';
        mainApp.style.display = 'none';

        // Load dynamic images
        btn.innerText = "Loading Photos...";
        await loadImagesInGrid('pdfAccessPhotosGrid', 'accessPhotos');
        await loadImagesInGrid('pdfMiscPhotosGrid', 'miscPhotos');
        await new Promise(r => setTimeout(r, 800));

        const doc = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pages = Array.from(template.querySelectorAll('.pdf-page'));

        for(let i = 0; i < pages.length; i++) {
            btn.innerText = `Processing Page ${i+1} / ${pages.length}`;
            if(i > 0) doc.addPage();
            
            const canvas = await html2canvas(pages[i], {
                scale: 1.5,
                useCORS: true,
                windowWidth: 800,
                logging: false
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const imgProps = doc.getImageProperties(imgData);
            const ratio = imgProps.height / imgProps.width;
            doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfWidth * ratio);
            
            // Critical Memory Wipe
            canvas.width = 0;
            canvas.height = 0;
        }

        doc.save(fileName);
        
        // Restore UI
        template.style.display = 'none';
        mainApp.style.display = 'block';
        document.body.style.width = oldW;
        btn.innerText = originalText;
        btn.disabled = false;
    }

    // ==========================================
    // 4. DATA BINDING & GENERATION
    // ==========================================
    function getSurveyData() {
        const dName = document.getElementById('designerSelect').value || "Surveyor";
        const dProfile = designerProfiles[dName] || { phone: "", email: "", bio: "..." };
        const selectedBrand = document.getElementById('brandSelect').value;
        
        return {
            clientName: document.getElementById('clientName').value || 'Customer',
            clientNum: document.getElementById('clientNum').value || '',
            address: document.getElementById('postCode').value || '',
            date: document.getElementById('apptDate').value ? new Date(document.getElementById('apptDate').value).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
            buildType: document.getElementById('buildType').value || '',
            roofType: document.getElementById('roofType').value || '',
            proposedSize: document.getElementById('proposedSize').value || '',
            frameColour: document.getElementById('frameColour').value || '',
            houseMaterial: document.getElementById('houseMaterial').value || '',
            dpcDepth: document.getElementById('dpcDepth').value || '',
            fasciaHeight: document.getElementById('fasciaHeight').value || '',
            airBricks: document.getElementById('airbricks').value || '',
            buildingRegs: document.getElementById('buildingRegs').value || '',
            planningPerms: document.getElementById('planningPerms').value || '',
            sapCalcs: document.getElementById('sapCalcs').value || '',
            budget: document.getElementById('budget').value || '',
            accessDifficult: document.getElementById('accessDifficult').value || '',
            accessWidth: document.getElementById('accessWidth').value || '',
            wallObstacles: document.getElementById('wallObstacles').value || '',
            designerNotes: document.getElementById('designerNotes').value || '',
            miscNotes: document.getElementById('miscNotes').value || '',
            designerName: dName, 
            designerPhone: dProfile.phone, 
            designerEmail: dProfile.email, 
            designerBio: dProfile.bio, 
            logoSource: brandLogos[selectedBrand] || "logo.jpg"
        };
    }

    document.getElementById('generateInternalPdfBtn')?.addEventListener('click', async function() {
        const data = getSurveyData();
        const template = document.getElementById('pdfTemplateInternal');
        
        // Bind data
        template.querySelectorAll('.bind-name').forEach(el => el.innerText = data.clientName);
        template.querySelectorAll('.bind-num').forEach(el => el.innerText = data.clientNum);
        template.querySelectorAll('.bind-address').forEach(el => el.innerText = data.address);
        template.querySelectorAll('.bind-date').forEach(el => el.innerText = data.date);
        document.getElementById('pdfPrintDesigner').innerText = data.designerName;
        
        // Canvas JPEG Prep
        ['frontelevation', 'sideelevation', 'rearelevation', 'housematerialphoto', 'manhole', 'weepvents', 'rwpsvp', 'treelocations', 'designersketch'].forEach(id => {
            const fCanvas = window.appCanvases[id];
            const imgTag = document.getElementById(`pdfImgInternal-${id}`);
            if (fCanvas && imgTag) { fCanvas.renderAll(); imgTag.src = fCanvas.toDataURL({ format: 'jpeg', quality: 0.9 }); }
        });

        await executeSecurePDFGeneration('pdfTemplateInternal', `${data.clientName.replace(/\s+/g, '')}_Internal_Survey.pdf`, this);
    });

    document.getElementById('generateCustomerPdfBtn')?.addEventListener('click', async function() {
        const data = getSurveyData();
        const template = document.getElementById('pdfTemplateCustomer');
        
        // Landing Page Binding
        document.getElementById('lp-greeting').innerText = `Hi ${data.clientName.split(' ')[0]}, thanks for your time...`;
        document.getElementById('pdfDesignerBio').innerText = data.designerBio;
        document.getElementById('pdfDesignerName').innerText = data.designerName;
        document.getElementById('pdfDesignerContact').innerText = `${data.designerPhone} | ${data.designerEmail}`;
        template.querySelectorAll('.bind-name').forEach(el => el.innerText = data.clientName);
        
        // Canvas JPEG Prep
        const frontCanvas = window.appCanvases['frontelevation'];
        if (frontCanvas) { frontCanvas.renderAll(); document.getElementById('pdfImgCustomer-frontelevation').src = frontCanvas.toDataURL({ format: 'jpeg', quality: 0.9 }); }

        await executeSecurePDFGeneration('pdfTemplateCustomer', `${data.clientName.replace(/\s+/g, '')}_Consultation.pdf`, this);
    });
});
