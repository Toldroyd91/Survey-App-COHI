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
        const toggleBtn = group.querySelector('.toggle-draw-btn');
        const clearBtn = group.querySelector('.clear-btn');
        const fileInput = group.querySelector('.camera-input');
        if (!canvasEl) return;
        
        const fCanvas = new fabric.Canvas(canvasEl.id, { isDrawingMode: false });
        fCanvas.freeDrawingBrush.color = '#FF0000';
        fCanvas.freeDrawingBrush.width = 4;
        window.appCanvases[id] = fCanvas;

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                fCanvas.isDrawingMode = !fCanvas.isDrawingMode;
                if (fCanvas.isDrawingMode) {
                    toggleBtn.style.background = '#28a745';
                    toggleBtn.textContent = '✅ Drawing On (Tap to Lock)';
                } else {
                    toggleBtn.style.background = '#0F3759';
                    toggleBtn.textContent = '✏️ Enable Drawing';
                }
            });
        }

        if (fileInput) {
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
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                fCanvas.getObjects().forEach(obj => fCanvas.remove(obj));
                fCanvas.setBackgroundImage(null, fCanvas.renderAll.bind(fCanvas));
            });
        }
    });

    const resetBtn = document.getElementById('resetFormBtn');
    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
            if(confirm("Are you sure? This will wipe all data for the next appointment.")) {
                localStorage.removeItem('surveyAppData');
                inputsToSave.forEach(input => input.value = '');
                const dateInput = document.getElementById('apptDate');
                if(dateInput) dateInput.valueAsDate = new Date(); 

                Object.values(window.appCanvases).forEach(fCanvas => {
                    fCanvas.getObjects().forEach(obj => fCanvas.remove(obj));
                    fCanvas.setBackgroundImage(null, fCanvas.renderAll.bind(fCanvas));
                });

                const accessPhotos = document.getElementById('accessPhotos');
                const miscPhotos = document.getElementById('miscPhotos');
                if(accessPhotos) accessPhotos.value = '';
                if(miscPhotos) miscPhotos.value = '';

                window.scrollTo(0, 0);
            }
        });
    }

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
            img.style.width = '100%';
            img.style.height = '200px';
            img.style.objectFit = 'contain';
            img.style.border = '1px solid #dee2e6';
            img.style.backgroundColor = '#fff';
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
        
        // --- THE GHOST RENDER FIX ---
        // Keeps the template in the rendering tree, bypassing the 0x0 display:none bug
        const originalOpacity = mainApp.style.opacity;
        const originalPointerEvents = mainApp.style.pointerEvents;
        
        mainApp.style.opacity = '0'; 
        mainApp.style.pointerEvents = 'none';
        
        template.style.display = 'block';
        template.style.position = 'absolute';
        template.style.top = '0';
        template.style.left = '-9999px'; 
        template.style.width = '800px';

        try {
            btn.innerText = "Loading Photos...";
            await loadImagesInGrid('pdfAccessPhotosGrid', 'accessPhotos');
            await loadImagesInGrid('pdfMiscPhotosGrid', 'miscPhotos');
            
            // Critical pause to allow the hardware GPU to paint the DOM
            await new Promise(r => setTimeout(r, 800)); 

            const doc = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = doc.internal.pageSize.getWidth();
            
            // Automatic Fallback Logic - Finds pages even if you didn't mark them
            let pages = Array.from(template.querySelectorAll('.pdf-page'));
            if (pages.length === 0) {
                pages = Array.from(template.children).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && el.tagName !== 'SCRIPT';
                });
            }

            for(let i = 0; i < pages.length; i++) {
                btn.innerText = `Rendering Page ${i+1}/${pages.length}...`;
                
                const canvas = await html2canvas(pages[i], {
                    scale: 1.5, // Retina Resolution, safe from GPU crashes
                    useCORS: true,
                    windowWidth: 800,
                    logging: false
                });
                
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const imgProps = doc.getImageProperties(imgData);
                const ratio = imgProps.height / imgProps.width;
                
                if (i > 0) doc.addPage();
                doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfWidth * ratio);
                
                canvas.width = 0; // Crucial Memory Wipe step
            }

            btn.innerText = "Finalizing PDF...";
            doc.save(fileName);
        } catch (error) {
            console.error("CAPTURE FAILED:", error);
            alert("Capture Failed. Ensure images are valid.");
        } finally {
            // Smoothly restore the UI state
            template.style.display = 'none';
            template.style.position = '';
            template.style.top = '';
            template.style.left = '';
            template.style.width = '';
            mainApp.style.opacity = originalOpacity || '1';
            mainApp.style.pointerEvents = originalPointerEvents || 'auto';
            btn.innerText = originalText;
            btn.disabled = false;
        }
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
        
        template.querySelectorAll('.bind-name').forEach(el => el.innerText = data.clientName);
        template.querySelectorAll('.bind-num').forEach(el => el.innerText = data.clientNum);
        template.querySelectorAll('.bind-address').forEach(el => el.innerText = data.address);
        template.querySelectorAll('.bind-date').forEach(el => el.innerText = data.date);
        
        const designerEl = document.getElementById('pdfPrintDesigner');
        if (designerEl) designerEl.innerText = data.designerName;
        
        ['BuildType', 'RoofType', 'ProposedSize', 'FrameColour', 'HouseMaterial', 'DpcDepth', 'FasciaHeight', 'AirBricks', 'BuildingRegs', 'PlanningPerms', 'SapCalcs', 'Budget', 'AccessDifficult', 'AccessWidth', 'WallObstacles', 'DesignerNotes', 'MiscNotes'].forEach(key => {
            const el = document.getElementById(`pdf${key}`);
            if (el) el.innerText = data[key.charAt(0).toLowerCase() + key.slice(1)];
        });
        
        ['frontelevation', 'sideelevation', 'rearelevation', 'housematerialphoto', 'manhole', 'weepvents', 'rwpsvp', 'treelocations', 'designersketch'].forEach(id => {
            const fCanvas = window.appCanvases[id];
            const imgTag = document.getElementById(`pdfImgInternal-${id}`);
            if (fCanvas && imgTag) { fCanvas.renderAll(); imgTag.src = fCanvas.toDataURL({ format: 'jpeg', quality: 0.95 }); }
        });

        await executeSecurePDFGeneration('pdfTemplateInternal', `${data.clientName.replace(/\s+/g, '')}_Internal_Survey.pdf`, this);
    });

    document.getElementById('generateCustomerPdfBtn')?.addEventListener('click', async function() {
        const data = getSurveyData();
        const template = document.getElementById('pdfTemplateCustomer');
        
        const greetingEl = document.getElementById('lp-greeting');
        if (greetingEl) greetingEl.innerHTML = `Hi ${data.clientName.split(' ')[0]},<br><br>I want to say a massive thank you for inviting me into your home today. I’ve put together this summary document outlining the major talking points from our appointment so we both know we are on exactly the right lines. If there is anything you'd like to adjust, please don't hesitate to get in touch.`;
        
        const bioEl = document.getElementById('pdfDesignerBio');
        if(bioEl) bioEl.innerText = data.designerBio;
        
        const nameEl = document.getElementById('pdfDesignerName');
        if(nameEl) nameEl.innerText = data.designerName;
        
        const contactEl = document.getElementById('pdfDesignerContact');
        if(contactEl) contactEl.innerText = `${data.designerPhone} | ${data.designerEmail}`;
        
        template.querySelectorAll('.bind-name').forEach(el => el.innerText = data.clientName);
        template.querySelectorAll('.bind-address').forEach(el => el.innerText = data.address);
        template.querySelectorAll('.bind-date').forEach(el => el.innerText = data.date);
        
        const selectedWeepVents = document.getElementById('weepventsExist')?.value;

        ['pamphlet-sap', 'pamphlet-planning-full', 'pamphlet-planning-pre', 'pamphlet-cavity'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        if (data.sapCalcs === 'Yes') {
            const el = document.getElementById('pamphlet-sap');
            if(el) el.style.display = 'block';
        }
        if (data.planningPerms === 'Full Planning') {
            const el = document.getElementById('pamphlet-planning-full');
            if(el) el.style.display = 'block';
        }
        if (data.planningPerms === 'Pre Approved Planning') {
            const el = document.getElementById('pamphlet-planning-pre');
            if(el) el.style.display = 'block';
        }
        if (data.buildType === 'Extension' && selectedWeepVents === 'Yes') {
            const el = document.getElementById('pamphlet-cavity');
            if(el) el.style.display = 'block';
        }

        const frontCanvas = window.appCanvases['frontelevation'];
        if (frontCanvas) { 
            frontCanvas.renderAll(); 
            const imgEl = document.getElementById('pdfImgCustomer-frontelevation');
            if (imgEl) imgEl.src = frontCanvas.toDataURL({ format: 'jpeg', quality: 0.95 }); 
        }

        await executeSecurePDFGeneration('pdfTemplateCustomer', `${data.clientName.replace(/\s+/g, '')}_Consultation.pdf`, this);
    });
});
