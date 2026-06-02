document.addEventListener('DOMContentLoaded', function() {
    console.log("[Diagnostics] Engine Started. Loading modules...");

    const dateInput = document.getElementById('apptDate');
    if(dateInput && !dateInput.value) {
        dateInput.valueAsDate = new Date();
    }

    // ==========================================
    // 1. DIGITAL DICTIONARIES
    // ==========================================
    const designerProfiles = {
        "Tom": { phone: "07700 900000", email: "tom@cohi.co.uk", defaultBrand: "Yorkshire Windows", bio: "Thank you for welcoming me into your home today. Over the next 48 hours, I will be passing these precise measurements to our architectural team to generate your 3D visual renders and structural quote." },
        "Sarah": { phone: "07700 900001", email: "sarah@cohi.co.uk", defaultBrand: "CO Home Improvements", bio: "It was a pleasure meeting you to discuss your new living space. I am now compiling your technical requirements to generate a comprehensive, bespoke quotation and design mockup." },
        "Mark": { phone: "07700 900002", email: "mark@cohi.co.uk", defaultBrand: "CO Home Improvements", bio: "Thank you for your time today. I am personally overseeing the initial design phase of your project. We will have your custom 3D concepts and pricing structure ready for review shortly." }
    };

    // YOUR CUSTOM BRAND LOGOS
    const brandLogos = {
        "Clearview": "clearview.png",
        "CO Home Improvements": "logo.jpg",
        "Orion Windows": "orion.png",
        "Planet Windows": "planet.png",
        "Trent Valley Windows": "trentvalley.png",
        "West Yorkshire Windows": "westyorkshire.png",
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
    // 2. AUTO-SAVE ENGINE
    // ==========================================
    const inputsToSave = document.querySelectorAll('input:not([type="file"]), textarea, select');
    const savedData = JSON.parse(localStorage.getItem('surveyAppData')) || {};
    
    inputsToSave.forEach(input => {
        if (savedData[input.id]) input.value = savedData[input.id];
        input.addEventListener('input', () => {
            savedData[input.id] = input.value;
            localStorage.setItem('surveyAppData', JSON.stringify(savedData));
        });
    });

    const resetBtn = document.getElementById('resetFormBtn');
    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
            if(confirm("Are you sure? This will wipe all data for the next appointment.")) {
                localStorage.removeItem('surveyAppData');
                inputsToSave.forEach(input => input.value = '');
                if(dateInput) dateInput.valueAsDate = new Date(); 
                Object.values(window.appCanvases).forEach(fCanvas => {
                    fCanvas.getObjects().forEach(obj => fCanvas.remove(obj));
                    fCanvas.setBackgroundImage(null, fCanvas.renderAll.bind(fCanvas));
                });
                window.scrollTo(0, 0);
            }
        });
    }

    // ==========================================
    // 3. MULTI-CANVAS ENGINE
    // ==========================================
    window.appCanvases = {};
    document.querySelectorAll('.canvas-group').forEach(group => {
        const id = group.getAttribute('data-id');
        const canvasEl = group.querySelector('canvas');
        const fileInput = group.querySelector('.camera-input');
        const clearBtn = group.querySelector('.clear-btn');
        if (!canvasEl) return; 

        const fCanvas = new fabric.Canvas(canvasEl.id, { isDrawingMode: true });
        fCanvas.freeDrawingBrush.color = '#FF0000';
        fCanvas.freeDrawingBrush.width = 4;
        window.appCanvases[id] = fCanvas;

        fileInput.addEventListener('change', function(e) {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = function(f) {
                const nativeImg = new Image();
                nativeImg.onload = function() {
                    const fabricImg = new fabric.Image(nativeImg);
                    const scale = Math.min(fCanvas.width / fabricImg.width, fCanvas.height / fabricImg.height);
                    fabricImg.set({ originX: 'center', originY: 'center', scaleX: scale, scaleY: scale, left: fCanvas.width / 2, top: fCanvas.height / 2 });
                    fCanvas.setBackgroundImage(fabricImg, fCanvas.renderAll.bind(fCanvas));
                };
                nativeImg.src = f.target.result;
            };
            reader.readAsDataURL(file);
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                fCanvas.getObjects().forEach(obj => fCanvas.remove(obj));
                fCanvas.setBackgroundImage(null, fCanvas.renderAll.bind(fCanvas));
            });
        }
    });

    // ==========================================
    // 4. PDF GENERATION
    // ==========================================
    function getSurveyData() {
        const dName = document.getElementById('designerSelect').value || "Surveyor";
        const dProfile = designerProfiles[dName] || { phone: "", email: "", bio: "We will be in touch shortly with your quote." };
        const selectedBrand = document.getElementById('brandSelect').value;
        const logoFile = brandLogos[selectedBrand] || "logo.jpg";

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
            designerName: dName, designerPhone: dProfile.phone, designerEmail: dProfile.email, designerBio: dProfile.bio, logoSource: logoFile
        };
    }

    const generateInternalBtn = document.getElementById('generateInternalPdfBtn');
    if (generateInternalBtn) {
        generateInternalBtn.addEventListener('click', function() {
            const data = getSurveyData();
            const fileName = `${data.clientName.replace(/\s+/g, '')}_Internal_Survey.pdf`;

            document.querySelectorAll('#pdfTemplateInternal .brand-logo-img').forEach(img => img.src = data.logoSource);
            const mapsLink = document.getElementById('googleMapsLink');
            if(data.address) { mapsLink.href = `http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(data.address)}`; mapsLink.style.display = "inline"; } 
            else { mapsLink.style.display = "none"; }

            const template = document.getElementById('pdfTemplateInternal');
            template.querySelectorAll('.bind-name').forEach(el => el.innerText = data.clientName);
            template.querySelectorAll('.bind-num').forEach(el => el.innerText = data.clientNum);
            template.querySelectorAll('.bind-address').forEach(el => el.innerText = data.address);
            template.querySelectorAll('.bind-date').forEach(el => el.innerText = data.date);
            document.getElementById('pdfPrintDesigner').innerText = data.designerName;
            
            document.getElementById('pdfBuildType').innerText = data.buildType;
            document.getElementById('pdfRoofType').innerText = data.roofType;
            document.getElementById('pdfProposedSize').innerText = data.proposedSize;
            document.getElementById('pdfFrameColour').innerText = data.frameColour;
            document.getElementById('pdfHouseMaterial').innerText = data.houseMaterial;
            document.getElementById('pdfDpcDepth').innerText = data.dpcDepth;
            document.getElementById('pdfFasciaHeight').innerText = data.fasciaHeight;
            document.getElementById('pdfAirBricks').innerText = data.airBricks;
            document.getElementById('pdfBuildingRegs').innerText = data.buildingRegs;
            document.getElementById('pdfPlanningPerms').innerText = data.planningPerms;
            document.getElementById('pdfSapCalcs').innerText = data.sapCalcs;
            document.getElementById('pdfBudget').innerText = data.budget;
            document.getElementById('pdfAccessDifficult').innerText = data.accessDifficult;
            document.getElementById('pdfAccessWidth').innerText = data.accessWidth;
            document.getElementById('pdfWallObstacles').innerText = data.wallObstacles;
            document.getElementById('pdfDesignerNotes').innerText = data.designerNotes;
            document.getElementById('pdfMiscNotes').innerText = data.miscNotes;

            // HIGH-RES PNG UPGRADE FOR ALL CANVASES
            ['frontelevation', 'sideelevation', 'rearelevation', 'housematerialphoto', 'manhole', 'weepvents', 'rwpsvp', 'treelocations', 'miscphotos', 'designersketch'].forEach(id => {
                const fCanvas = window.appCanvases[id];
                const imgTag = document.getElementById(`pdfImgInternal-${id}`);
                if (fCanvas && imgTag) { 
                    fCanvas.renderAll(); 
                    imgTag.src = fCanvas.toDataURL({ format: 'png' }); 
                }
            });

            const mainApp = document.querySelector('main');
            window.scrollTo(0, 0);
            mainApp.style.display = 'none';
            template.style.display = 'block';
            
            // HIGH-RES 4K PDF CONFIGURATION
            html2pdf().set({ 
                filename: fileName, 
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { scale: 4, useCORS: true, letterRendering: true, scrollY: 0 }, 
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
            }).from(template).save().then(() => {
                template.style.display = 'none';
                mainApp.style.display = 'block';
            });
        });
    }

    const generateCustomerBtn = document.getElementById('generateCustomerPdfBtn');
    if (generateCustomerBtn) {
        generateCustomerBtn.addEventListener('click', function() {
            const data = getSurveyData();
            const fileName = `${data.clientName.replace(/\s+/g, '')}_Design_Consultation.pdf`;
            const template = document.getElementById('pdfTemplateCustomer');
            
            template.querySelectorAll('.brand-logo-img').forEach(img => img.src = data.logoSource);
            document.getElementById('pdfDesignerBio').innerText = data.designerBio;
            document.getElementById('pdfDesignerName').innerText = data.designerName;
            document.getElementById('pdfDesignerContact').innerText = `${data.designerPhone} | ${data.designerEmail}`;
            template.querySelectorAll('.bind-name').forEach(el => el.innerText = data.clientName);
            template.querySelectorAll('.bind-address').forEach(el => el.innerText = data.address);
            template.querySelectorAll('.bind-date').forEach(el => el.innerText = data.date);

            // HIGH-RES PNG UPGRADE FOR COVER PHOTO
            const frontCanvas = window.appCanvases['frontelevation'];
            if (frontCanvas) { 
                frontCanvas.renderAll(); 
                document.getElementById('pdfImgCustomer-frontelevation').src = frontCanvas.toDataURL({ format: 'png' }); 
            }

            const mainApp = document.querySelector('main');
            window.scrollTo(0, 0);
            mainApp.style.display = 'none';
            template.style.display = 'block';
            
            // HIGH-RES 4K PDF CONFIGURATION
            html2pdf().set({ 
                filename: fileName, 
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { scale: 4, useCORS: true, letterRendering: true, scrollY: 0 }, 
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
            }).from(template).save().then(() => {
                template.style.display = 'none';
                mainApp.style.display = 'block';
            });
        });
    }
});