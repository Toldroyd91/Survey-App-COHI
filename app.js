async function executeSecurePDFGeneration(templateId, fileName, btn) {
        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerText = "Synchronizing...";

        const template = document.getElementById(templateId);
        const mainApp = document.querySelector('main') || document.body.firstElementChild;
        
        // --- VISIBLE OVERLAY MODE ---
        // We make it visible so the browser is FORCED to render it.
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
            await loadImagesInGrid('pdfAccessPhotosGrid', 'accessPhotos');
            await loadImagesInGrid('pdfMiscPhotosGrid', 'miscPhotos');
            
            // Give the browser 1 full second to finish painting the pixels
            await new Promise(r => setTimeout(r, 1000)); 

            const doc = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = doc.internal.pageSize.getWidth();
            const margin = 10;
            const usableWidth = pdfWidth - (margin * 2);

            let pages = Array.from(template.querySelectorAll('.pdf-page'));
            if (pages.length === 0) {
                pages = Array.from(template.children).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && el.tagName !== 'SCRIPT';
                });
            }

            for(let i = 0; i < pages.length; i++) {
                btn.innerText = `Printing Page ${i+1}/${pages.length}...`;
                
                // ADDED BREATHER: Force a tiny delay between pages to let GPU rest
                await new Promise(r => setTimeout(r, 500)); 

                const canvas = await html2canvas(pages[i], {
                    scale: 1.5,
                    useCORS: true,
                    windowWidth: 800,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const imgProps = doc.getImageProperties(imgData);
                const ratio = imgProps.height / imgProps.width;
                
                if (i > 0) doc.addPage();
                doc.addImage(imgData, 'JPEG', margin, margin, usableWidth, usableWidth * ratio);
                
                canvas.width = 0; 
                canvas.height = 0;
            }

            doc.save(fileName);
        } catch (error) {
            console.error("CAPTURE FAILED:", error);
            alert("Capture Failed. Please try again.");
        } finally {
            // Restore UI
            template.style.display = 'none';
            template.style.position = '';
            mainApp.style.opacity = '1';
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
