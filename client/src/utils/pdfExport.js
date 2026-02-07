import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const downloadPDF = async (elementId, fileName = 'document.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
        alert(`Export Error: Could not find element with id "${elementId}"`);
        return;
    }

    // Check if element has content
    if (element.innerHTML.trim() === '') {
        alert('Export Error: The invoice template is empty. Please wait a moment and try again.');
        return;
    }

    try {
        console.log(`Starting PDF export for: ${elementId}`);
        const originalStyle = {
            display: element.style.display,
            position: element.style.position,
            visibility: element.style.visibility,
            left: element.style.left,
            top: element.style.top,
            width: element.style.width,
            zIndex: element.style.zIndex
        };

        // Make it "visible" but off-screen to get proper layout
        element.style.display = 'block';
        element.style.position = 'fixed';
        element.style.visibility = 'visible';
        element.style.left = '-9999px';
        element.style.top = '0';
        element.style.width = '900px'; 
        element.style.zIndex = '9999';

        // Wait for images and layout to settle
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: true,
            backgroundColor: '#ffffff',
            windowWidth: 900
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(fileName);

        // Restore everything
        Object.assign(element.style, originalStyle);
        console.log('PDF export successful');
    } catch (error) {
        console.error('Detailed PDF Export Error:', error);
        alert(`Failed to generate PDF: ${error.message || 'Unknown technical error'}`);
    }
};
