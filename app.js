document.addEventListener('DOMContentLoaded', function() {
    console.log("[Diagnostics] Final Boardroom Engine Loaded.");
    const { jsPDF } = window.jspdf;

    // --- CANVAS ENGINE ---
    window.appCanvases = {};
    document.querySelectorAll('.canvas-group').forEach(group => {
        const id = group.getAttribute('data-id');
        const canvasEl = group.querySelector('canvas');
        if (canvasEl) {
            const fCanvas = new fabric.Canvas(canvasEl.id, { isDrawingMode: false });
            window.appCanvases[id] = fCanvas;
        }
    });

    // --- SECURE PDF RENDERER ---
    async function executeSecurePDFGeneration(templateId, fileName, btn) {
        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerText = "Processing...";

        const template = document.getElementById(templateId);
        const mainApp = document.querySelector('main') || document.body.firstElementChild;
        
        // Ghost Render: Push off-screen to force browser GPU to paint pixels
        template.style.display = 'block';
        template.style.position = 'absolute';
        template.style.top = '0';
        template.style.left = '0';
        template.style.width = '800px';
        template.style.zIndex = '999999';
        template.style.backgroundColor = '#ffffff';
        mainApp.style.opacity = '0'; 
        window.scrollTo(0, 0);

        try {
            await new Promise(r => setTimeout(r, 1000)); 

            const doc = new jsPDF('p', 'mm', 'a4');
            const margin = 10;
            const pdfPrintWidth = doc.internal.pageSize.getWidth() - (margin * 2);
            
            // Capture entire template as ONE page to avoid loop crashes
            const canvas = await html2canvas(template, {
                scale: 1.5,
                useCORS: true,
                windowWidth: 800,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const ratio = canvas.height / canvas.width;
            doc.addImage(imgData, 'JPEG', margin, margin, pdfPrintWidth, pdfPrintWidth * ratio);
            
            doc.save(fileName);
        } catch (error) {
            console.error("CAPTURE FAILED:", error);
            alert("Capture Failed. Ensure all images are loaded.");
        } finally {
            template.style.display = 'none';
            template.style.position = '';
            mainApp.style.opacity = '1';
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }

    // --- BRUTE-FORCE BINDING ---
    function bindData(template, data) {
        // Use a simple loop that ignores missing IDs to prevent crash
        const keys = ['Name', 'Num', 'Address', 'Date', 'BuildType', 'RoofType', 'ProposedSize', 'FrameColour', 'HouseMaterial', 'DpcDepth', 'FasciaHeight', 'AirBricks', 'BuildingRegs', 'PlanningPerms', 'SapCalcs', 'Budget', 'AccessDifficult', 'AccessWidth', 'WallObstacles', 'DesignerNotes', 'MiscNotes'];
        keys.forEach(k => {
            const el = template.querySelector(`#pdf${k}`);
            if (el) el.innerText = data[k.toLowerCase()] || '';
        });
    }

    document.getElementById('generateInternalPdfBtn')?.addEventListener('click', async function() {
        const template = document.getElementById('pdfTemplateInternal');
        // Simple data gather
        const data = {
            name: document.getElementById('clientName')?.value,
            address: document.getElementById('postCode')?.value
        };
        bindData(template, data);
        await executeSecurePDFGeneration('pdfTemplateInternal', 'Survey.pdf', this);
    });

    document.getElementById('generateCustomerPdfBtn')?.addEventListener('click', async function() {
        const template = document.getElementById('pdfTemplateCustomer');
        await executeSecurePDFGeneration('pdfTemplateCustomer', 'Design.pdf', this);
    });
});
