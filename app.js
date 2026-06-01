document.addEventListener('DOMContentLoaded', function() {
    console.log("[Diagnostics] Final Executive Engine Loaded.");
    const { jsPDF } = window.jspdf;

    const designerProfiles = {
        "Tom": { phone: "07700 900000", email: "tom@cohi.co.uk", defaultBrand: "Yorkshire Windows" },
        "Sobaan": { phone: "07700 900001", email: "sobaan@cohi.co.uk", defaultBrand: "CO Home Improvements" },
        "James": { phone: "07700 900002", email: "james@cohi.co.uk", defaultBrand: "CO Home Improvements" }
    };

    const brandLogos = {
        "Clearview": "clearview.png", "CO Home Improvements": "logo.jpg", "Orion Windows": "orion.png",
        "Planet": "planet.png", "Trent Valley Windows": "trentvalley.png", "West Yorkshire Windows": "westyorkshire.png",
        "Yorkshire Windows": "yorkshire.png"
    };

    // Canvas Initialization
    window.appCanvases = {};
    document.querySelectorAll('.canvas-group').forEach(group => {
        const id = group.getAttribute('data-id');
        const canvasEl = group.querySelector('canvas');
        if (canvasEl) {
            window.appCanvases[id] = new fabric.Canvas(canvasEl.id, { isDrawingMode: false });
        }
    });

    // --- SECURE LOGO CONVERTER ---
    // This stops Apple iOS from crashing the app due to local file security rules
    async function applySafeLogo(template, logoUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    const b64 = canvas.toDataURL('image/png');
                    template.querySelectorAll('.brand-logo-img').forEach(el => {
                        el.src = b64;
                        el.style.display = 'inline-block';
                    });
                    resolve();
                } catch(e) {
                    // If Safari blocks it, hide the logo to save the PDF
                    template.querySelectorAll('.brand-logo-img').forEach(el => el.style.display = 'none');
                    resolve();
                }
            };
            img.onerror = function() {
                template.querySelectorAll('.brand-logo-img').forEach(el => el.style.display = 'none');
                resolve();
            };
            img.src = logoUrl;
        });
    }

    async function executeSecurePDFGeneration(templateId, fileName, btn) {
        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerText = "Processing...";

        const template = document.getElementById(templateId);
        const mainApp = document.querySelector('main') || document.body.firstElementChild;
        
        template.style.display = 'block';
        template.style.position = 'absolute';
        template.style.top = '0';
        template.style.left = '0';
        template.style.width = '800px';
        template.style.zIndex = '999999';
        template.style.backgroundColor = '#ffffff';
        mainApp.style.display = 'none';
        window.scrollTo(0, 0);

        try {
            await new Promise(r => setTimeout(r, 800)); 

            const doc = new jsPDF('p', 'mm', 'a4');
            const margin = 10;
            const pdfPrintWidth = doc.internal.pageSize.getWidth() - (margin * 2);
            
            let pages = Array.from(template.querySelectorAll('.pdf-page')).filter(el => window.getComputedStyle(el).display !== 'none');

            for(let i = 0; i < pages.length; i++) {
                btn.innerText = `Printing Page ${i+1}/${pages.length}...`;
                
                const canvas = await html2canvas(pages[i], {
                    scale: 1.5, 
                    useCORS: true,
                    allowTaint: false, // Changed to false to prevent iOS SecurityError panics
                    windowWidth: 800,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const ratio = canvas.height / canvas.width;
                
                if (i > 0) doc.addPage();
                doc.addImage(imgData, 'JPEG', margin, margin, pdfPrintWidth, pdfPrintWidth * ratio);
                
                canvas.width = 0; canvas.height = 0; 
            }

            doc.save(fileName);
        } catch (error) {
            console.error("CAPTURE FAILED:", error);
            alert("Capture Failed: " + error.message);
        } finally {
            template.style.display = 'none';
            template.style.position = '';
            mainApp.style.display = 'block';
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }

    // --- BRUTE-FORCE BINDING ---
    function getSurveyData() {
        const dName = document.getElementById('designerSelect')?.value || "Surveyor";
        const selectedBrand = document.getElementById('brandSelect')?.value || "CO Home Improvements";
        const profile = designerProfiles[dName] || { phone: "", email: "" };
        
        return {
            clientName: document.getElementById('clientName')?.value || 'Customer',
            clientNum: document.getElementById('clientNum')?.value || '',
            address: document.getElementById('postCode')?.value || '',
            date: document.getElementById('apptDate')?.value ? new Date(document.getElementById('apptDate').value).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
            buildType: document.getElementById('buildType')?.value || '',
            roofType: document.getElementById('roofType')?.value || '',
            frameColour: document.getElementById('frameColour')?.value || '',
            planningPerms: document.getElementById('planningPerms')?.value || '',
            sapCalcs: document.getElementById('sapCalcs')?.value || '',
            designerName: dName,
            designerPhone: profile.phone,
            designerEmail: profile.email,
            logoSource: brandLogos[selectedBrand] || "logo.jpg"
        };
    }

    document.getElementById('generateInternalPdfBtn')?.addEventListener('click', async function() {
        const data = getSurveyData();
        const template = document.getElementById('pdfTemplateInternal');
        
        try {
            await applySafeLogo(template, data.logoSource);

            template.querySelectorAll('.bind-name').forEach(el => el.innerText = data.clientName);
            template.querySelectorAll('.bind-num').forEach(el => el.innerText = data.clientNum);
            template.querySelectorAll('.bind-address').forEach(el => el.innerText = data.address);
            template.querySelectorAll('.bind-date').forEach(el => el.innerText = data.date);
            
            const designerEl = document.getElementById('pdfPrintDesigner');
            if (designerEl) designerEl.innerText = data.designerName;
            
            ['BuildType', 'RoofType', 'ProposedSize', 'FrameColour', 'HouseMaterial', 'DpcDepth', 'FasciaHeight', 'AirBricks', 'BuildingRegs', 'PlanningPerms', 'SapCalcs', 'Budget', 'AccessDifficult', 'AccessWidth', 'WallObstacles', 'DesignerNotes', 'MiscNotes'].forEach(key => {
                const inputEl = document.getElementById(key.charAt(0).toLowerCase() + key.slice(1));
                const textEl = document.getElementById(`pdf${key}`);
                if (inputEl && textEl) textEl.innerText = inputEl.value;
            });
            
            ['frontelevation', 'sideelevation', 'rearelevation', 'housematerialphoto', 'manhole', 'weepvents', 'rwpsvp', 'treelocations', 'designersketch'].forEach(id => {
                const fCanvas = window.appCanvases[id];
                const imgTag = document.getElementById(`pdfImgInternal-${id}`);
                if (fCanvas && imgTag) { fCanvas.renderAll(); imgTag.src = fCanvas.toDataURL({ format: 'jpeg', quality: 0.9 }); }
            });
        } catch (e) { console.warn("Binding bypass:", e); }

        await executeSecurePDFGeneration('pdfTemplateInternal', 'Internal_Survey.pdf', this);
    });

    document.getElementById('generateCustomerPdfBtn')?.addEventListener('click', async function() {
        const data = getSurveyData();
        const template = document.getElementById('pdfTemplateCustomer');
        
        try {
            // Apply logo securely before rendering
            await applySafeLogo(template, data.logoSource);

            template.querySelectorAll('.bind-name').forEach(el => el.innerText = data.clientName);
            template.querySelectorAll('.bind-address').forEach(el => el.innerText = data.address);
            template.querySelectorAll('.bind-date').forEach(el => el.innerText = data.date);

            const greetingEl = document.getElementById('lp-greeting');
            const firstName = data.clientName.split(' ')[0] || 'Customer';
            if (greetingEl) greetingEl.innerHTML = `Hi ${firstName},<br><br>Thank you for welcoming me into your home today. I’ve put together this summary document outlining the major talking points from our appointment.`;
            
            const nameEl = document.getElementById('lp-designer-name');
            if(nameEl) nameEl.innerText = data.designerName;
            
            const contactEl = document.getElementById('lp-designer-contact');
            if(contactEl) contactEl.innerText = `${data.designerPhone} | ${data.designerEmail}`;
            
            const selectedWeepVents = document.getElementById('weepventsExist')?.value;

            ['pamphlet-sap', 'pamphlet-planning', 'pamphlet-cavity'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            if (data.sapCalcs === 'Yes') {
                const el = document.getElementById('pamphlet-sap');
                if(el) el.style.display = 'block';
            }
            if (data.planningPerms === 'Full Planning' || data.planningPerms === 'Pre Approved Planning') {
                const el = document.getElementById('pamphlet-planning');
                if(el) el.style.display = 'block';
            }
            if (data.buildType === 'Extension' && selectedWeepVents === 'Yes') {
                const el = document.getElementById('pamphlet-cavity');
                if(el) el.style.display = 'block';
            }
            
        } catch (e) { console.warn("Binding bypass:", e); }

        await executeSecurePDFGeneration('pdfTemplateCustomer', 'Design_Consultation.pdf', this);
    });
});