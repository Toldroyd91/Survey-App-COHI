document.addEventListener('DOMContentLoaded', function() {
    console.log("[Diagnostics] Final Boardroom Engine Loaded.");
    const { jsPDF } = window.jspdf;

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

    // Canvas & AutoSave Initialization
    window.appCanvases = {};
    document.querySelectorAll('.canvas-group').forEach(group => {
        const id = group.getAttribute('data-id');
        const canvasEl = group.querySelector('canvas');
        if (canvasEl) {
            const fCanvas = new fabric.Canvas(canvasEl.id, { isDrawingMode: false });
            fCanvas.freeDrawingBrush.color = '#FF0000';
            fCanvas.freeDrawingBrush.width = 4;
            window.appCanvases[id] = fCanvas;
        }
    });

    // Helper: Base64 converter for images to bypass security errors
    async function toBase64(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    async function executeSecurePDFGeneration(templateId, fileName, btn) {
        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerText = "Processing...";

        const template = document.getElementById(templateId);
        const mainApp = document.querySelector('main') || document.body.firstElementChild;
        
        // Force the template visible so the browser draws it
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
            // Wait for DOM to finish painting
            await new Promise(r => setTimeout(r, 1000)); 

            const doc = new jsPDF('p', 'mm', 'a4');
            const margin = 10;
            const pdfPrintWidth = doc.internal.pageSize.getWidth() - (margin * 2);
            
            let pages = Array.from(template.querySelectorAll('.pdf-page'));
            if (pages.length === 0) pages = Array.from(template.children).filter(el => el.style.display !== 'none' && el.tagName !== 'SCRIPT');

            for(let i = 0; i < pages.length; i++) {
                btn.innerText = `Printing Page ${i+1}/${pages.length}...`;
                
                const canvas = await html2canvas(pages[i], {
                    scale: 1.5,
                    useCORS: true,
                    allowTaint: true,
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

    // Trigger buttons
    document.getElementById('generateInternalPdfBtn')?.addEventListener('click', async function() {
        await executeSecurePDFGeneration('pdfTemplateInternal', 'Internal_Survey.pdf', this);
    });

    document.getElementById('generateCustomerPdfBtn')?.addEventListener('click', async function() {
        await executeSecurePDFGeneration('pdfTemplateCustomer', 'Design_Consultation.pdf', this);
    });
});
