document.addEventListener('DOMContentLoaded', function() {
    console.log("[Diagnostics] Enterprise PDF Engine Started. Loading modules...");

    const dateInput = document.getElementById('apptDate');
    if(dateInput && !dateInput.value) {
        dateInput.valueAsDate = new Date();
    }

    // ==========================================
    // 1. DIGITAL DICTIONARIES
    // ==========================================
    const designerProfiles = {
        "Tom": { phone: "07700 900000", email: "tom@cohi.co.uk", defaultBrand: "Yorkshire Windows", bio: "Thank you for welcoming me into your home today. Over the next 48 hours, I will be passing these precise measurements to our architectural team to generate your 3D visual renders and structural quote." },
        "Sobaan": { phone: "07700 900001", email: "sobaan@cohi.co.uk", defaultBrand: "CO Home Improvements", bio: "It was a pleasure meeting you to discuss your new living space. I am now compiling your technical requirements to generate a comprehensive, bespoke quotation and design mockup." },
        "James": { phone: "07700 900002", email: "james@cohi.co.uk", defaultBrand: "CO Home Improvements", bio: "Thank you for your time today. I am personally overseeing the initial design phase of your project. We will have your custom 3D concepts and pricing structure ready for review shortly." }
    };

    const brandLogos = {
        "Clearview": "clearview.png",
        "CO Home Improvements": "logo.jpg",
        "Orion Windows": "orion.png",
        "Planet": "planet.png",
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

                const accessPhotos = document.getElementById('accessPhotos');
                const miscPhotos = document.getElementById('miscPhotos');
                if(accessPhotos) accessPhotos.value = '';
                if(miscPhotos) miscPhotos.value = '';

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
        const toggleBtn = group.querySelector('.toggle-draw-btn');
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

    // ==========================================
    // 4. ENTERPRISE PDF GENERATION ENGINE
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

    // THE CRASH-PROOF RENDERING LOOP
    async function executeSecurePDFGeneration(templateId, fileName, triggerBtn) {
        const originalText = triggerBtn.innerText;
        triggerBtn.disabled = true;
        
        const template = document.getElementById(templateId);
        const mainApp = document.querySelector('main');
        
        // Mobile Viewport Hack to un-squish the template
        const originalWidth = document.body.style.width;
        const originalOverflow = document.body.style.overflow;
        document.body.style.width = '800px';
        document.body.style.overflow = 'visible';
        
        mainApp.style.display = 'none';
        template.style.display = 'block';
        template.style.position = 'absolute';
        template.style.top = '0';
        template.style.left = '0';
        template.style.width = '800px';
        window.scrollTo(0, 0);

        try {
            // Give DOM 500ms to load images/layouts
            await new Promise(resolve => setTimeout(resolve, 500));

            // Find pages. Looks for .pdf-page class, falls back to direct children if missing
            let pages = Array.from(template.querySelectorAll('.pdf-page'));
            if (pages.length === 0) {
                pages = Array.from(template.children).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && el.tagName !== 'SCRIPT';
                });
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = doc.internal.pageSize.getWidth();

            for (let i = 0; i < pages.length; i++) {
                triggerBtn.innerText = `Processing Page ${i + 1} of ${pages.length}...`;
                await new Promise(resolve => setTimeout(resolve, 100)); // UI breather

                if (i > 0) doc.addPage();

                const canvas = await html2canvas(pages[i], {
                    scale: 2, // High-Res Retina Quality
                    useCORS: true,
                    windowWidth: 800,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                
                // Calculate correct aspect ratio height to prevent stretching
                const imgProps = doc.getImageProperties(imgData);
                const ratio = imgProps.height / imgProps.width;
                const finalHeight = pdfWidth * ratio;

                doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, finalHeight);

                // EXTREMELY CRITICAL: Free up device GPU memory immediately
                canvas.width = 0;
                canvas.height = 0;
            }

            triggerBtn.innerText = "Finalizing Document...";
            doc.save(fileName);

        } catch (error) {
            console.error("Critical rendering failure:", error);
            alert("A rendering error occurred. Please ensure all photos are fully loaded.");
        } finally {
            // Restore original UI state
            document.body.style.width = originalWidth;
            document.body.style.overflow = originalOverflow;
            template.style.display = 'none';
            template.style.position = '';
            template.style.top = '';
            template.style.left = '';
            template.style.width = '';
            mainApp.style.display = 'block';
            triggerBtn.innerText = originalText;
            triggerBtn.disabled = false;
        }
    }

    const generateInternalBtn = document.getElementById('generateInternalPdfBtn');
    if (generateInternalBtn) {
        generateInternalBtn.addEventListener('click', async function() {
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

            // --- INJECT MULTIPLE ACCESS PHOTOS ---
            const accessPhotosGrid = document.getElementById('pdfAccessPhotosGrid');
            if (accessPhotosGrid) {
                accessPhotosGrid.innerHTML = ''; 
                const accessInput = document.getElementById('accessPhotos');
                if (accessInput && accessInput.files.length > 0) {
                    Array.from(accessInput.files).forEach(file => {
                        let img = document.createElement('img');
                        img.src = URL.createObjectURL(file);
                        img.style.width = '100%';
                        img.style.height = '200px';
                        img.style.objectFit = 'contain';
                        img.style.border = '1px solid #dee2e6';
                        img.style.borderRadius = '4px';
                        img.style.backgroundColor = '#fff';
                        accessPhotosGrid.appendChild(img);
                    });
                }
            }

            // --- INJECT MULTIPLE MISC PHOTOS ---
            const miscPhotosGrid = document.getElementById('pdfMiscPhotosGrid');
            if (miscPhotosGrid) {
                miscPhotosGrid.innerHTML = ''; 
                const miscInput = document.getElementById('miscPhotos');
                if (miscInput && miscInput.files.length > 0) {
                    Array.from(miscInput.files).forEach(file => {
                        let img = document.createElement('img');
                        img.src = URL.createObjectURL(file);
                        img.style.width = '100%';
                        img.style.height = '200px';
                        img.style.objectFit = 'contain';
                        img.style.border = '1px solid #dee2e6';
                        img.style.borderRadius = '4px';
                        img.style.backgroundColor = '#fff';
                        miscPhotosGrid.appendChild(img);
                    });
                }
            }

            // High-res JPEG injection for canvases
            ['frontelevation', 'sideelevation', 'rearelevation', 'housematerialphoto', 'manhole', 'weepvents', 'rwpsvp', 'treelocations', 'designersketch'].forEach(id => {
                const fCanvas = window.appCanvases[id];
                const imgTag = document.getElementById(`pdfImgInternal-${id}`);
                if (fCanvas && imgTag) { 
                    fCanvas.renderAll(); 
                    imgTag.src = fCanvas.toDataURL({ format: 'jpeg', quality: 0.95 }); 
                }
            });

            // Launch the secure generation engine
            await executeSecurePDFGeneration('pdfTemplateInternal', fileName, this);
        });
    }

    const generateCustomerBtn = document.getElementById('generateCustomerPdfBtn');
    if (generateCustomerBtn) {
        generateCustomerBtn.addEventListener('click', async function() {
            const data = getSurveyData();
            const fileName = `${data.clientName.replace(/\s+/g, '')}_Design_Consultation.pdf`;
            const template = document.getElementById('pdfTemplateCustomer');

            // --- 1. DYNAMIC LANDING PAGE LOGIC ---
            const clientFirst = data.clientName.split(' ')[0] || 'Customer';
            const build = document.getElementById('buildType').value;
            const size = document.getElementById('proposedSize').value;
            const roof = document.getElementById('roofType').value;
            const frame = document.getElementById('frameColour').value;
            const buildMat = document.getElementById('newBuildMaterial') ? document.getElementById('newBuildMaterial').value : '';
            const planPerm = document.getElementById('planningPerms').value;
            const buildReg = document.getElementById('buildingRegs').value;
            const sap = document.getElementById('sapCalcs').value;

            const rawRevDate = document.getElementById('revisitDate') ? document.getElementById('revisitDate').value : '';
            const revDate = rawRevDate ? new Date(rawRevDate).toLocaleDateString('en-GB') : '';
            const revLoc = document.getElementById('revisitLocation') ? document.getElementById('revisitLocation').value : '';

            document.getElementById('lp-greeting').innerHTML = `Hi ${clientFirst},<br><br>I want to say a massive thank you for inviting me into your home today. I’ve put together this summary document outlining the major talking points from our appointment so we both know we are on exactly the right lines. If there is anything you'd like to adjust, please don't hesitate to get in touch.`;

            if (build && size) {
                document.getElementById('lp-size').innerText = `We discussed creating a beautiful new ${build} with an approximate footprint of ${size}. This gives us a fantastic starting point for your bespoke design.`;
            } else {
                document.getElementById('lp-size').innerText = `We didn't quite pinpoint the exact dimensions of your build just yet, which is absolutely fine. We have plenty of flexibility to work towards the perfect size as we develop the design.`;
            }

            if (roof) {
                document.getElementById('lp-roof').innerText = `Regarding the roof, the ${roof} really stood out as our primary choice, but there are plenty of other stunning options we can explore too as we refine the details.`;
            } else {
                document.getElementById('lp-roof').innerText = `We have yet to decide on the final roof style, but I will prepare a few different options for you to review so we can find the perfect match for your home.`;
            }

            if (frame && buildMat) {
                document.getElementById('lp-frame').innerText = `Our current first choice for the frame colour is ${frame}, which is going to pair beautifully with the ${buildMat} we have chosen for the base.`;
            } else if (frame) {
                document.getElementById('lp-frame').innerText = `Our current first choice for the frame colour is ${frame}, which is going to look fantastic.`;
            } else {
                document.getElementById('lp-frame').innerText = `We haven't narrowed down the final frame colour or build materials just yet, but we have an incredible range to choose from. Just let me know when you are ready to explore them.`;
            }

            const planText = (planPerm === 'No' || !planPerm) ? 'do not' : 'do';
            const regText = (buildReg === 'Yes') ? 'do' : 'do not';
            const sapText = (sap === 'Yes') ? 'do' : 'do not';
            document.getElementById('lp-compliance').innerText = `Based on your choices, it looks like we ${planText} need Planning Permission, we ${regText} need Building Regulations, and we ${sapText} need SAP calculations. Please don't worry about the technicalities of these—I have included a brief explanation of what they mean later in this pack, and our team will handle all of it for you.`;

            if (revDate && revLoc) {
                document.getElementById('lp-revisit').innerText = `We are booked back in to see you at ${revLoc} on ${revDate}. If you need anything at all before then, you can contact me on the details below.`;
            } else {
                document.getElementById('lp-revisit').innerText = `We haven't booked in a date for our next catch-up just yet, but as soon as we work out a time, we will get you scheduled in. If you need anything before I next get in touch, please contact me on the details below.`;
            }

            document.getElementById('lp-designer-name').innerText = data.designerName;
            document.getElementById('lp-designer-contact').innerText = `${data.designerPhone} | ${data.designerEmail}`;

            // --- 2. DYNAMIC PAMPHLET LOGIC ---
            const selectedWeepVents = document.getElementById('weepventsExist').value;

            document.getElementById('pamphlet-sap').style.display = 'none';
            document.getElementById('pamphlet-planning-full').style.display = 'none';
            document.getElementById('pamphlet-planning-pre').style.display = 'none';
            document.getElementById('pamphlet-cavity').style.display = 'none';

            if (sap === 'Yes') {
                document.getElementById('pamphlet-sap').style.display = 'block';
            }
            if (planPerm === 'Full Planning') {
                document.getElementById('pamphlet-planning-full').style.display = 'block';
            }
            if (planPerm === 'Pre Approved Planning') {
                document.getElementById('pamphlet-planning-pre').style.display = 'block';
            }
            if (build === 'Extension' && selectedWeepVents === 'Yes') {
                document.getElementById('pamphlet-cavity').style.display = 'block';
            }

            // --- 3. BIND STANDARD DATA & RENDER ---
            template.querySelectorAll('.brand-logo-img').forEach(img => img.src = data.logoSource);
            document.getElementById('pdfDesignerBio').innerText = data.designerBio;
            document.getElementById('pdfDesignerName').innerText = data.designerName;
            document.getElementById('pdfDesignerContact').innerText = `${data.designerPhone} | ${data.designerEmail}`;
            template.querySelectorAll('.bind-name').forEach(el => el.innerText = data.clientName);
            template.querySelectorAll('.bind-address').forEach(el => el.innerText = data.address);
            template.querySelectorAll('.bind-date').forEach(el => el.innerText = data.date);

            // High-res JPEG injection for front elevation cover
            const frontCanvas = window.appCanvases['frontelevation'];
            if (frontCanvas) { 
                frontCanvas.renderAll(); 
                document.getElementById('pdfImgCustomer-frontelevation').src = frontCanvas.toDataURL({ format: 'jpeg', quality: 0.95 }); 
            }

            // Launch the secure generation engine
            await executeSecurePDFGeneration('pdfTemplateCustomer', fileName, this);
        });
    }
});
