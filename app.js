document.addEventListener('DOMContentLoaded', function() {
    console.log("[Diagnostics] Blueprint Pinch-to-Zoom, Compression & AI Engine Loaded.");
    const { jsPDF } = window.jspdf;

    // ==========================================
    // 1. AUTONOMOUS DESIGNER PROFILES
    // ==========================================
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

    // Profile Modal Controls
    const profileModal = document.getElementById('profileModal');
    document.getElementById('openProfileManagerBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const currentName = document.getElementById('designerSelect').value;
        if (currentName && window.designerProfiles[currentName]) {
            document.getElementById('profName').value = currentName;
            document.getElementById('profEmail').value = window.designerProfiles[currentName].email || '';
            document.getElementById('profPhone').value = window.designerProfiles[currentName].phone || '';
        }
        profileModal.style.display = 'flex';
    });

    document.getElementById('closeProfileBtn')?.addEventListener('click', () => profileModal.style.display = 'none');

    document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
        const name = document.getElementById('profName').value.trim();
        const email = document.getElementById('profEmail').value.trim();
        const phone = document.getElementById('profPhone').value.trim();
        
        if (!name) return alert("Please enter a designer name.");

        window.designerProfiles[name] = { email, phone };
        localStorage.setItem('savedDesignerProfiles', JSON.stringify(window.designerProfiles));
        
        document.getElementById('designerSelect').value = name;
        refreshDesignerDropdown();
        profileModal.style.display = 'none';
    });

    // ==========================================
    // 2. AUTO-SAVE & SESSION RECOVERY
    // ==========================================
    const formInputs = document.querySelectorAll('input:not([type="file"]), select, textarea');
    const savedData = JSON.parse(localStorage.getItem('surveyAppData')) || {};
    
    formInputs.forEach(input => {
        if (savedData[input.id] && input.id !== 'designerSelect') {
            input.value = savedData[input.id];
        }
        input.addEventListener('input', () => {
            savedData[input.id] = input.value;
            localStorage.setItem('surveyAppData', JSON.stringify(savedData));
        });
    });

    document.getElementById('resetFormBtn')?.addEventListener('click', () => {
        if(confirm('Are you sure you want to completely clear this form for your next appointment?')) {
            localStorage.removeItem('surveyAppData');
            location.reload();
        }
    });

    // ==========================================
    // 3. VOICE DICTATION & AI POLISH
    // ==========================================
    const dictateBtn = document.getElementById('dictateBtn');
    const notesArea = document.getElementById('designerNotes');
    
    if (dictateBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        let isRecording = false;

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            }
            if (finalTranscript) {
                notesArea.value += (notesArea.value.endsWith(' ') || notesArea.value === '' ? '' : ' ') + finalTranscript.trim() + '. ';
                notesArea.dispatchEvent(new Event('input')); // Trigger autosave
            }
        };
        
        dictateBtn.addEventListener('click', () => {
            if(isRecording) {
                recognition.stop(); 
                dictateBtn.innerHTML = '🎙️ Dictate'; 
                dictateBtn.style.background = '#e63946';
            } else {
                recognition.start(); 
                dictateBtn.innerHTML = '🛑 Stop'; 
                dictateBtn.style.background = '#8b0000';
            }
            isRecording = !isRecording;
        });
    }

    document.getElementById('aiPolishBtn')?.addEventListener('click', async function() {
        const rawNotes = document.getElementById('designerNotes').value;
        if (!rawNotes) return alert("Please type or dictate some notes first.");
        
        const btn = this;
        btn.textContent = "⏳ Polishing...";
        btn.disabled = true;
        
        try {
            // NOTE: Insert your actual OpenAI API key here before going live!
            const apiKey = "YOUR_OPENAI_API_KEY_HERE"; 
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: `Rewrite these surveyor field notes into clear, highly professional, grammatically correct full sentences suitable for a customer-facing document. Fix any dictation errors. Keep the tone helpful: ${rawNotes}` }]
                })
            });
            
            if (!response.ok) throw new Error("API call failed. Did you insert your API Key?");
            
            const data = await response.json();
            document.getElementById('polishedNotes').value = data.choices[0].message.content;
            
            alert("Notes successfully polished! The AI version will now be used on the Customer PDF.");
        } catch(e) {
            alert("AI Polish Error: " + e.message);
        } finally {
            btn.textContent = "✨ AI Polish";
            btn.disabled = false;
        }
    });

    // ==========================================
    // 4. INTERACTIVE FABRIC VECTOR ENGINE
    // ==========================================
    window.appCanvases = {};
    document.querySelectorAll('.canvas-group').forEach(group => {
        const id = group.getAttribute('data-id');
        const canvasEl = group.querySelector('canvas');
        if (!canvasEl) return;

        const fCanvas = new fabric.Canvas(canvasEl.id, { 
            isDrawingMode: false, allowTouchScrolling: true, selection: false
        });
        fCanvas.freeDrawingBrush.color = '#FF0000';
        fCanvas.freeDrawingBrush.width = 4;
        window.appCanvases[id] = fCanvas;

        let activeTool = 'locked'; 
        let isDrawingLine = false; let activeLineObj = null; let startX = 0; let startY = 0;

        const lockBtn = group.querySelector('.lock-btn');
        const freehandBtn = group.querySelector('.freehand-btn');
        const highlightBtn = group.querySelector('.highlight-btn');
        const lineBtn = group.querySelector('.line-btn');
        const dimLineBtn = group.querySelector('.dim-line-btn');
        const textBtn = group.querySelector('.text-btn');
        
        // Pins & Stamps
        const stampMhBtn = group.querySelector('.stamp-mh-btn');
        const stampSvpBtn = group.querySelector('.stamp-svp-btn');
        const stampTapBtn = group.querySelector('.stamp-tap-btn');
        const pin1Btn = group.querySelector('.pin-1-btn');
        const pin2Btn = group.querySelector('.pin-2-btn');
        const pin3Btn = group.querySelector('.pin-3-btn');
        
        const undoBtn = group.querySelector('.undo-btn');
        const maximizeBtn = group.querySelector('.maximize-btn');
        const clearBtn = group.querySelector('.clear-btn');
        const fileInput = group.querySelector('.camera-input');
        const canvasContainer = group.querySelector('.canvas-container');

        // Camera Engine
        let isPinching = false; let lastPinchDist = 0; let isPanning = false; let lastPanX = 0; let lastPanY = 0;

        fCanvas.on('mouse:wheel', function(opt) {
            let delta = opt.e.deltaY; let zoom = fCanvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 10) zoom = 10; if (zoom < 0.5) zoom = 0.5;
            fCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault(); opt.e.stopPropagation();
        });

        fCanvas.on('mouse:down', function(opt) {
            if (activeTool === 'locked' && !isPinching) {
                isPanning = true;
                lastPanX = opt.e.clientX || (opt.e.touches && opt.e.touches[0].clientX);
                lastPanY = opt.e.clientY || (opt.e.touches && opt.e.touches[0].clientY);
            }
        });

        fCanvas.on('mouse:move', function(opt) {
            if (isPanning && activeTool === 'locked') {
                let e = opt.e;
                let currentX = e.clientX || (e.touches && e.touches[0].clientX);
                let currentY = e.clientY || (e.touches && e.touches[0].clientY);
                if (currentX && currentY && lastPanX && lastPanY) {
                    let vpt = fCanvas.viewportTransform;
                    vpt[4] += currentX - lastPanX; vpt[5] += currentY - lastPanY; 
                    fCanvas.requestRenderAll(); lastPanX = currentX; lastPanY = currentY;
                }
            }
        });

        fCanvas.on('mouse:up', function() { isPanning = false; fCanvas.setViewportTransform(fCanvas.viewportTransform); });

        canvasContainer.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                isPinching = true; isPanning = false; fCanvas.isDrawingMode = false; 
                lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            }
        }, { passive: false });

        canvasContainer.addEventListener('touchmove', function(e) {
            if (isPinching && e.touches.length === 2) {
                e.preventDefault(); 
                let currentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                let zoom = fCanvas.getZoom(); zoom *= (currentDist / lastPinchDist); 
                if (zoom > 10) zoom = 10; if (zoom < 0.5) zoom = 0.5;
                let rect = canvasContainer.getBoundingClientRect();
                let pinchCenterX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
                let pinchCenterY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
                fCanvas.zoomToPoint({ x: pinchCenterX, y: pinchCenterY }, zoom);
                lastPinchDist = currentDist;
            }
        }, { passive: false });

        canvasContainer.addEventListener('touchend', function(e) {
            if (isPinching && e.touches.length < 2) {
                isPinching = false;
                if (activeTool === 'freehand' || activeTool === 'highlight') fCanvas.isDrawingMode = true; 
            }
        });

        function setButtonState(tool) {
            activeTool = tool; const z = fCanvas.getZoom();
            lockBtn?.classList.toggle('canvas-locked', tool === 'locked');
            if (lockBtn) lockBtn.textContent = (tool === 'locked') ? '🔒 Locked for Scroll & Pan' : '🔓 Canvas Active';
            freehandBtn?.classList.toggle('active', tool === 'freehand');
            highlightBtn?.classList.toggle('active', tool === 'highlight');
            lineBtn?.classList.toggle('active', tool === 'line');
            dimLineBtn?.classList.toggle('active', tool === 'dim-line');
            textBtn?.classList.toggle('active', tool === 'text');

            fCanvas.isDrawingMode = (tool === 'freehand' || tool === 'highlight');
            if (tool === 'freehand') { fCanvas.freeDrawingBrush.color = '#FF0000'; fCanvas.freeDrawingBrush.width = 4 / z; } 
            else if (tool === 'highlight') { fCanvas.freeDrawingBrush.color = 'rgba(255, 255, 0, 0.4)'; fCanvas.freeDrawingBrush.width = 25 / z; }

            fCanvas.selection = (tool === 'text' || tool === 'locked'); 
            fCanvas.allowTouchScrolling = (tool === 'locked' || tool === 'text');
            fCanvas.getObjects().forEach(obj => { obj.selectable = (tool === 'text'); obj.editable = (tool === 'text'); });
            fCanvas.discardActiveObject();
            
            if (tool === 'line') bindLineTool(); else if (tool === 'dim-line') bindDimLineTool(); else if (tool === 'text') bindTextTool();
            fCanvas.calcOffset(); fCanvas.renderAll();
        }

        function bindLineTool() {
            fCanvas.off('mouse:down'); fCanvas.off('mouse:move'); fCanvas.off('mouse:up');
            fCanvas.on('mouse:down', function(o) {
                if (activeTool !== 'line') return;
                isDrawingLine = true; const pointer = fCanvas.getPointer(o.e);
                startX = pointer.x; startY = pointer.y; const z = fCanvas.getZoom();
                activeLineObj = new fabric.Line([startX, startY, startX, startY], { strokeWidth: 4 / z, stroke: '#FF0000', originX: 'center', originY: 'center', selectable: false, hasControls: false });
                fCanvas.add(activeLineObj);
            });
            fCanvas.on('mouse:move', function(o) {
                if (!isDrawingLine || activeTool !== 'line') return;
                const pointer = fCanvas.getPointer(o.e); activeLineObj.set({ x2: pointer.x, y2: pointer.y }); fCanvas.renderAll();
            });
            fCanvas.on('mouse:up', function() { if (activeTool !== 'line') return; isDrawingLine = false; if (activeLineObj) activeLineObj.setCoords(); fCanvas.renderAll(); });
        }

        function bindDimLineTool() {
            fCanvas.off('mouse:down'); fCanvas.off('mouse:move'); fCanvas.off('mouse:up');
            fCanvas.on('mouse:down', function(o) {
                if (activeTool !== 'dim-line') return;
                isDrawingLine = true; const pointer = fCanvas.getPointer(o.e);
                startX = pointer.x; startY = pointer.y; const z = fCanvas.getZoom();
                activeLineObj = new fabric.Line([startX, startY, startX, startY], { strokeWidth: 3 / z, stroke: '#0D6EFD', strokeDashArray: [5 / z, 5 / z], originX: 'center', originY: 'center', selectable: false, hasControls: false });
                fCanvas.add(activeLineObj);
            });
            fCanvas.on('mouse:move', function(o) {
                if (!isDrawingLine || activeTool !== 'dim-line') return;
                const pointer = fCanvas.getPointer(o.e); activeLineObj.set({ x2: pointer.x, y2: pointer.y }); fCanvas.renderAll();
            });
            fCanvas.on('mouse:up', function() {
                if (activeTool !== 'dim-line') return;
                isDrawingLine = false;
                if (activeLineObj) {
                    activeLineObj.setCoords(); const x1 = activeLineObj.x1, y1 = activeLineObj.y1, x2 = activeLineObj.x2, y2 = activeLineObj.y2;
                    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI; const z = fCanvas.getZoom(); const arrowSize = 12 / z;
                    const arrow1 = new fabric.Triangle({ width: arrowSize, height: arrowSize, fill: '#0D6EFD', left: x1, top: y1, originX: 'center', originY: 'center', angle: angle - 90, selectable: false });
                    const arrow2 = new fabric.Triangle({ width: arrowSize, height: arrowSize, fill: '#0D6EFD', left: x2, top: y2, originX: 'center', originY: 'center', angle: angle + 90, selectable: false });
                    fCanvas.add(arrow1, arrow2);
                }
                fCanvas.renderAll();
            });
        }

        function bindTextTool() {
            fCanvas.off('mouse:down'); fCanvas.off('mouse:move'); fCanvas.off('mouse:up');
            fCanvas.on('mouse:down', function(o) {
                if (activeTool !== 'text') return;
                const target = fCanvas.findTarget(o.e); if (target && (target.type === 'i-text' || target.type === 'text' || target.type === 'group')) return;
                const pointer = fCanvas.getPointer(o.e); const z = fCanvas.getZoom();
                const mmText = new fabric.IText('3000 mm', { left: pointer.x, top: pointer.y, fontFamily: 'system-ui', fontSize: 20 / z, fill: '#FFFF00', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.65)', padding: 6 / z, cornerSize: 8 / z, transparentCorners: false, hasControls: true });
                fCanvas.add(mmText); fCanvas.setActiveObject(mmText); fCanvas.renderAll();
            });
        }

        function addStamp(text, bgColor) {
            const z = fCanvas.getZoom(); const vpt = fCanvas.viewportTransform;
            const centerX = (fCanvas.width / 2 - vpt[4]) / z; const centerY = (fCanvas.height / 2 - vpt[5]) / z;
            const shape = new fabric.Rect({ width: 50 / z, height: 30 / z, fill: bgColor, originX: 'center', originY: 'center', rx: 4 / z, ry: 4 / z });
            const label = new fabric.Text(text, { fontSize: 14 / z, fill: '#FFFFFF', fontWeight: 'bold', originX: 'center', originY: 'center', fontFamily: 'system-ui' });
            const grp = new fabric.Group([shape, label], { left: centerX, top: centerY, originX: 'center', originY: 'center', hasControls: true, borderColor: '#FF0000', cornerColor: '#FF0000', cornerSize: 8 / z, transparentCorners: false });
            fCanvas.add(grp); fCanvas.setActiveObject(grp); setButtonState('text'); 
        }

        function addPin(number, color) {
            const z = fCanvas.getZoom(); const vpt = fCanvas.viewportTransform;
            const centerX = (fCanvas.width / 2 - vpt[4]) / z; const centerY = (fCanvas.height / 2 - vpt[5]) / z;
            const circle = new fabric.Circle({ radius: 15 / z, fill: color, originX: 'center', originY: 'center', stroke: '#fff', strokeWidth: 2 / z });
            const label = new fabric.Text(number, { fontSize: 16 / z, fill: '#FFFFFF', fontWeight: 'bold', originX: 'center', originY: 'center', fontFamily: 'system-ui' });
            const grp = new fabric.Group([circle, label], { left: centerX, top: centerY, originX: 'center', originY: 'center', hasControls: true, cornerColor: color, cornerSize: 8 / z, transparentCorners: false });
            fCanvas.add(grp); fCanvas.setActiveObject(grp); setButtonState('text'); 
        }

        lockBtn?.addEventListener('click', (e) => { e.preventDefault(); setButtonState('locked'); });
        freehandBtn?.addEventListener('click', (e) => { e.preventDefault(); setButtonState('freehand'); });
        highlightBtn?.addEventListener('click', (e) => { e.preventDefault(); setButtonState('highlight'); });
        lineBtn?.addEventListener('click', (e) => { e.preventDefault(); setButtonState('line'); });
        dimLineBtn?.addEventListener('click', (e) => { e.preventDefault(); setButtonState('dim-line'); });
        textBtn?.addEventListener('click', (e) => { e.preventDefault(); setButtonState('text'); });

        stampMhBtn?.addEventListener('click', (e) => { e.preventDefault(); addStamp('MH', '#0D6EFD'); });
        stampSvpBtn?.addEventListener('click', (e) => { e.preventDefault(); addStamp('PIPE', '#6c757d'); });
        stampTapBtn?.addEventListener('click', (e) => { e.preventDefault(); addStamp('TAP', '#0dcaf0'); });
        
        pin1Btn?.addEventListener('click', (e) => { e.preventDefault(); addPin('1', '#0D6EFD'); });
        pin2Btn?.addEventListener('click', (e) => { e.preventDefault(); addPin('2', '#0dcaf0'); });
        pin3Btn?.addEventListener('click', (e) => { e.preventDefault(); addPin('3', '#ffc107'); });

        undoBtn?.addEventListener('click', (e) => {
            e.preventDefault(); const objects = fCanvas.getObjects();
            if (objects.length > 0) {
                const lastObj = objects[objects.length - 1];
                if (lastObj.type === 'triangle') {
                    fCanvas.remove(objects[objects.length - 1]); fCanvas.remove(objects[objects.length - 2]); fCanvas.remove(objects[objects.length - 3]);
                } else { fCanvas.remove(lastObj); }
                fCanvas.renderAll();
            }
        });

        clearBtn?.addEventListener('click', (e) => {
            e.preventDefault(); fCanvas.clear(); fCanvas.setBackgroundImage(null, fCanvas.renderAll.bind(fCanvas));
            fCanvas.setViewportTransform([1,0,0,1,0,0]); if (fileInput) fileInput.value = ''; setButtonState('locked');
        });

        maximizeBtn?.addEventListener('click', (e) => {
            e.preventDefault(); const isFull = group.classList.toggle('fullscreen-mode');
            fCanvas.setViewportTransform([1,0,0,1,0,0]); 
            if (isFull) {
                maximizeBtn.textContent = '📉 Close Screen'; fCanvas.setDimensions({ width: window.innerWidth - 40, height: window.innerHeight - 140 });
            } else {
                maximizeBtn.textContent = '🔍 Max Screen'; const currentBg = fCanvas.backgroundImage;
                if (currentBg) {
                    const imgRatio = currentBg.height / currentBg.width; const maxWidth = group.querySelector('.canvas-container').clientWidth || 600;
                    fCanvas.setDimensions({ width: maxWidth, height: maxWidth * imgRatio });
                } else {
                    fCanvas.setDimensions({ width: 600, height: 400 });
                }
            }
            setTimeout(() => { fCanvas.calcOffset(); fCanvas.renderAll(); }, 100);
        });

        // 5. AUTO IMAGE COMPRESSION ENGINE
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                if (!e.target.files || e.target.files.length === 0) return;
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = function(f) {
                    const nativeImg = new Image();
                    nativeImg.onload = function() {
                        // Compress Image before loading onto Canvas
                        const MAX_WIDTH = 1200;
                        let width = nativeImg.width; let height = nativeImg.height;
                        if (width > MAX_WIDTH) { height = Math.round(height *= MAX_WIDTH / width); width = MAX_WIDTH; }
                        
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = width; tempCanvas.height = height;
                        const ctx = tempCanvas.getContext('2d');
                        ctx.drawImage(nativeImg, 0, 0, width, height);
                        
                        const compressedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.85); // Compress heavily for RAM speed
                        
                        fCanvas.setViewportTransform([1,0,0,1,0,0]); 
                        const maxWidth = group.querySelector('.canvas-container').clientWidth || 600;
                        const dynamicHeight = maxWidth * (height / width);

                        fCanvas.setDimensions({ width: maxWidth, height: dynamicHeight });
                        
                        fabric.Image.fromURL(compressedDataUrl, function(fabricImg) {
                            const scale = Math.min(fCanvas.width / fabricImg.width, fCanvas.height / fabricImg.height);
                            fabricImg.set({ originX: 'center', originY: 'center', scaleX: scale, scaleY: scale, left: fCanvas.width / 2, top: fCanvas.height / 2, selectable: false });
                            fCanvas.setBackgroundImage(fabricImg, () => { fCanvas.calcOffset(); fCanvas.renderAll(); });
                        });
                    };
                    nativeImg.src = f.target.result;
                };
                reader.readAsDataURL(file);
            });
        }
    });

    // ==========================================
    // 6. PDF GENERATION & GPS BINDING
    // ==========================================
    async function applySafeLogo(template, logoUrl) {
        return new Promise((resolve) => {
            const img = new Image(); img.crossOrigin = "Anonymous";
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0); const b64 = canvas.toDataURL('image/png');
                    template.querySelectorAll('.brand-logo-img').forEach(el => { el.src = b64; el.style.display = 'inline-block'; });
                    resolve();
                } catch(e) { resolve(); }
            };
            img.onerror = function() { resolve(); }; img.src = logoUrl;
        });
    }

    async function loadPamphletImage(url) {
        return new Promise((resolve) => {
            const img = new Image(); img.crossOrigin = "Anonymous";
            img.onload = function() {
                const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0); resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = () => resolve(null); img.src = url;
        });
    }

    async function getGPSWatermark() {
        const dateStr = new Date().toLocaleString('en-GB');
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(`Survey Conducted: ${dateStr} | GPS Not Supported`);
            } else {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve(`Survey Conducted: ${dateStr} | Lat: ${pos.coords.latitude.toFixed(5)}, Lon: ${pos.coords.longitude.toFixed(5)}`),
                    (err) => resolve(`Survey Conducted: ${dateStr} | GPS Denied/Unavailable`)
                );
            }
        });
    }

    async function renderPhotosToGrid(inputId, gridId) {
        const input = document.getElementById(inputId);
        const grid = document.getElementById(gridId);
        if (!input || !grid) return;
        grid.innerHTML = '';
        if (!input.files || input.files.length === 0) return;
        for(let i=0; i<input.files.length; i++) {
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.readAsDataURL(input.files[i]);
            });
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.width = '100%'; img.style.height = '180px'; img.style.objectFit = 'cover';
            img.style.border = '1px solid #dee2e6'; img.style.borderRadius = '4px';
            grid.appendChild(img);
        }
    }

    async function executeSecurePDFGeneration(templateId, fileName, btn, data) {
        btn.disabled = true; const originalText = btn.innerText; btn.innerText = "Processing...";
        const template = document.getElementById(templateId); const mainApp = document.querySelector('main') || document.body.firstElementChild;

        template.style.display = 'block'; template.style.position = 'absolute';
        template.style.top = '0'; template.style.left = '0'; template.style.width = '800px';
        template.style.zIndex = '999999'; template.style.backgroundColor = '#ffffff';
        mainApp.style.display = 'none'; window.scrollTo(0, 0);

        try {
            await new Promise(r => setTimeout(r, 800)); 
            const doc = new jsPDF('p', 'mm', 'a4'); const margin = 10; const pdfPrintWidth = doc.internal.pageSize.getWidth() - (margin * 2);
            let pages = Array.from(template.querySelectorAll('.pdf-page')).filter(el => window.getComputedStyle(el).display !== 'none');

            for(let i = 0; i < pages.length; i++) {
                btn.innerText = `Printing Page ${i+1}/${pages.length}...`;
                const canvas = await html2canvas(pages[i], { scale: 1.5, useCORS: true, allowTaint: false, windowWidth: 800, logging: false, backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL('image/jpeg', 0.95); const ratio = canvas.height / canvas.width;
                if (i > 0) doc.addPage();
                doc.addImage(imgData, 'JPEG', margin, margin, pdfPrintWidth, pdfPrintWidth * ratio);
                canvas.width = 0; canvas.height = 0; 
            }

            if (templateId === 'pdfTemplateCustomer') {
                btn.innerText = "Attaching Pamphlets...";
                const pdfFullWidth = doc.internal.pageSize.getWidth(); const pdfFullHeight = doc.internal.pageSize.getHeight();
                if (data.sapCalcs === 'Yes') { const sapImg = await loadPamphletImage('sap-pamphlet.jpg'); if (sapImg) { doc.addPage(); doc.addImage(sapImg, 'JPEG', 0, 0, pdfFullWidth, pdfFullHeight); } }
                if (data.planningPerms === 'Full Planning' || data.planningPerms === 'Pre Approved Planning') { const planningImg = await loadPamphletImage('planning-pamphlet.jpg'); if (planningImg) { doc.addPage(); doc.addImage(planningImg, 'JPEG', 0, 0, pdfFullWidth, pdfFullHeight); } }
                if (data.buildType === 'Extension' && data.weepVents === 'Yes') { const cavityImg = await loadPamphletImage('cavity-pamphlet.jpg'); if (cavityImg) { doc.addPage(); doc.addImage(cavityImg, 'JPEG', 0, 0, pdfFullWidth, pdfFullHeight); } }
            }
            doc.save(fileName);
        } catch (error) { console.error("CAPTURE FAILED:", error); alert("Capture Failed: " + error.message); } finally {
            template.style.display = 'none'; template.style.position = ''; mainApp.style.display = 'block';
            btn.innerText = originalText; btn.disabled = false;
        }
    }

    function getSurveyData() {
        const dName = document.getElementById('designerSelect')?.value || "Surveyor";
        const selectedBrand = document.getElementById('brandSelect')?.value || "CO Home Improvements";
        const profile = window.designerProfiles[dName] || { phone: "", email: "" };
        const logos = window.brandLogos || {}; // Make sure brandLogos is defined in your actual environment!

        return {
            clientName: document.getElementById('clientName')?.value || 'Customer',
            clientNum: document.getElementById('clientNum')?.value || '',
            address: document.getElementById('postCode')?.value || '',
            date: document.getElementById('apptDate')?.value ? new Date(document.getElementById('apptDate').value).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
            revisitDate: document.getElementById('revisitDate')?.value ? new Date(document.getElementById('revisitDate').value).toLocaleDateString('en-GB') : '',
            revisitLocation: document.getElementById('revisitLocation')?.value || '',
            buildType: document.getElementById('buildType')?.value || '',
            roofType: document.getElementById('roofType')?.value || '',
            proposedSize: document.getElementById('proposedSize')?.value || '',
            frameColour: document.getElementById('frameColour')?.value || '',
            newBuildMaterial: document.getElementById('newBuildMaterial')?.value || '',
            planningPerms: document.getElementById('planningPerms')?.value || '',
            buildingRegs: document.getElementById('buildingRegs')?.value || '',
            sapCalcs: document.getElementById('sapCalcs')?.value || '',
            weepVents: document.getElementById('weepventsExist')?.value || '',
            designerName: dName, 
            designerPhone: profile.phone, 
            designerEmail: profile.email,
            logoSource: logos[selectedBrand] || "logo.jpg",
            designerNotes: document.getElementById('designerNotes')?.value || '',
            polishedNotes: document.getElementById('polishedNotes')?.value || '',
        };
    }

    document.getElementById('generateInternalPdfBtn')?.addEventListener('click', async function() {
        const data = getSurveyData();
        const template = document.getElementById('pdfTemplateInternal');

        try {
            await applySafeLogo(template, data.logoSource);

            // Fetch and set GPS Tracker
            const gpsEl = document.getElementById('pdfGpsTimestamp');
            if (gpsEl) gpsEl.innerText = await getGPSWatermark();

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

            ['masterlayout', 'frontelevation', 'sideelevation', 'rearelevation', 'housematerialphoto', 'manhole', 'weepvents', 'rwpsvp', 'treelocations', 'designersketch'].forEach(id => {
                const fCanvas = window.appCanvases[id];
                const imgTag = document.getElementById(`pdfImgInternal-${id}`);
                if (fCanvas && imgTag) { 
                    fCanvas.setViewportTransform([1,0,0,1,0,0]); 
                    fCanvas.discardActiveObject(); fCanvas.renderAll(); 
                    imgTag.src = fCanvas.toDataURL({ format: 'jpeg', quality: 0.9 }); 
                }
            });

            // Parse Multiple Photo Grids
            await renderPhotosToGrid('accessPhotos', 'pdfAccessPhotosGrid');
            await renderPhotosToGrid('miscPhotos', 'pdfMiscPhotosGrid');

        } catch (e) { console.warn("Binding bypass:", e); }

        const surname = data.clientName.trim().split(' ').pop() || 'Customer';
        await executeSecurePDFGeneration('pdfTemplateInternal', `${surname}_Internal_Survey.pdf`, this, data);
        
        if (typeof gtag === 'function') gtag('event', 'generate_pdf', { 'pdf_type': 'Internal Survey', 'designer': data.designerName });
    });

    document.getElementById('generateCustomerPdfBtn')?.addEventListener('click', async function() {
        const data = getSurveyData();
        const template = document.getElementById('pdfTemplateCustomer');

        try {
            await applySafeLogo(template, data.logoSource);

            const firstName = data.clientName.split(' ')[0] || 'Customer';
            const greetingEl = document.getElementById('lp-greeting');
            if (greetingEl) greetingEl.innerHTML = `Hi ${firstName},<br><br>I want to say a massive thank you for inviting me into your home today. I've put together this summary document outlining the major talking points from our appointment so we both know we are on exactly the right lines. If there is anything you'd like to adjust, please don't hesitate to get in touch.`;

            const sizeEl = document.getElementById('lp-size');
            if (sizeEl) {
                if (data.buildType && data.proposedSize) sizeEl.innerText = `As discussed, we are proposing a beautiful new ${data.buildType} measuring approximately ${data.proposedSize}mm. We have plenty of flexibility to adjust this as we develop the final design.`;
                else if (data.buildType) sizeEl.innerText = `As discussed, we are proposing a beautiful new ${data.buildType}. We didn't quite pinpoint the exact dimensions just yet, which is absolutely fine.`;
                else sizeEl.innerText = `We didn't quite pinpoint the exact dimensions of your build just yet, which is absolutely fine. We have plenty of flexibility to work towards the perfect size as we develop the design.`;
            }

            const roofEl = document.getElementById('lp-roof');
            if (roofEl) roofEl.innerText = data.roofType ? `To perfectly complement the build, we discussed incorporating a premium ${data.roofType} system. I will prepare a few different 3D options featuring this so you can see exactly how it looks.` : `We have yet to decide on the final roof style, but I will prepare a few different options for you to review so we can find the perfect match for your home.`;

            const frameEl = document.getElementById('lp-frame');
            if (frameEl) frameEl.innerText = data.frameColour ? `We agreed that the window and door frames will look fantastic finished in an elegant ${data.frameColour} colourway to match your property.` : `We haven't narrowed down the final frame colour or build materials just yet, but we have an incredible range to choose from.`;

            const complianceEl = document.getElementById('lp-compliance');
            if (complianceEl) {
                const needsPlanning = (data.planningPerms === 'Full Planning' || data.planningPerms === 'Pre Approved Planning');
                const needsRegs = (data.buildingRegs === 'Yes');
                const needsSap = (data.sapCalcs === 'Yes');
                if (!needsPlanning && !needsRegs && !needsSap) complianceEl.innerText = `Based on your choices, it looks like we do not need Planning Permission, we do not need Building Regulations, and we do not need SAP calculations.`;
                else {
                    let reqs = [];
                    if (needsPlanning) reqs.push(data.planningPerms); if (needsRegs) reqs.push("Building Regulations"); if (needsSap) reqs.push("SAP Calculations");
                    complianceEl.innerText = `Regarding compliance, based on our discussion your project will require ${reqs.join(', ').replace(/, ([^,]*)$/, ' and $1')}. Please don't worry about the technicalities of these—I have included a brief explanation of what they mean later in this pack.`;
                }
            }

            // Inject the Polished AI Notes (if they exist)
            const aiNotesEl = document.getElementById('lp-ai-notes');
            if (aiNotesEl) {
                if (data.polishedNotes.trim() !== '') {
                    aiNotesEl.innerText = `Designer Notes: ${data.polishedNotes}`;
                    aiNotesEl.style.display = 'block';
                } else {
                    aiNotesEl.style.display = 'none';
                }
            }

            const revisitEl = document.getElementById('lp-revisit');
            if (revisitEl) revisitEl.innerText = data.revisitDate ? `I look forward to our next catch-up scheduled for ${data.revisitDate}${data.revisitLocation ? ` at ${data.revisitLocation}` : ''}. We will go through your custom 3D designs together then.` : `We haven't booked in a date for our next catch-up just yet, but as soon as we work out a time, we will get you scheduled in.`;

            const nameEl = document.getElementById('lp-designer-name'); if(nameEl) nameEl.innerText = data.designerName;
            const contactEl = document.getElementById('lp-designer-contact'); if(contactEl) contactEl.innerText = `${data.designerPhone} | ${data.designerEmail}`;

        } catch (e) { console.warn("Binding bypass:", e); }

        const surname = data.clientName.trim().split(' ').pop() || 'Customer';
        await executeSecurePDFGeneration('pdfTemplateCustomer', `${surname}_Design_Consultation.pdf`, this, data);
        
        if (typeof gtag === 'function') gtag('event', 'generate_pdf', { 'pdf_type': 'Customer Pack', 'designer': data.designerName });
    });
});
