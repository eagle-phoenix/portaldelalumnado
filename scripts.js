const urls = {
    registro: "https://proxy-alumnado-production-41d7.up.railway.app/datos?tipo=registro",
    expediente: "https://proxy-alumnado-production-41d7.up.railway.app/datos?tipo=expediente"
};

function fetchSheetData(url) {
    return fetch(url)
        .then(res => res.json());
}


//Script para devolver al usuario los datos asociados al Nº de registro (en la tabla de Admisión):
document.querySelectorAll("form[data-type]").forEach(form => {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const type = form.dataset.type;
        const userId = form.querySelector("input").value.trim();
        const resultDiv = document.getElementById(`${type}Result`);
        const dateDiv = document.getElementById(`${type}FechaConsulta`);
        const pdfButton = document.getElementById(`${type}PdfButton`);
        const spinner = document.getElementById(`${type}Spinner`);
        
        resultDiv.innerHTML = "";
        dateDiv.innerHTML = "";
        pdfButton.style.display = "none";
        if (spinner) spinner.style.display = "block";

        if (!userId) {
            resultDiv.innerHTML = "<p style='color:red;'>Por favor, introduce un número válido.</p>";
            if (spinner) spinner.style.display = "none";
            return;
        }

        try {
            //const res = await fetch(urls[type]);
            //const text = await res.text();
            //const json = JSON.parse(text);
            const json = await fetchSheetData(urls[type]);
	    const match = json.find(row => String(row["Nº. Registro"]).trim() === userId);

            if (!match) {
                resultDiv.innerHTML = `<p style='color:red;'>No se encontraron datos para el ${type}: ${userId}</p>`;
                return;
            }

            const now = new Date();
            const formatted = now.toLocaleDateString() + " " + now.toLocaleTimeString();
            dateDiv.innerHTML = `<strong>Datos recuperados el:</strong> ${formatted}`;

            const excludedColumns = ["DNI", "EMAIL", "FECHA NAC", "FECHA ENTRADA", "APELLIDOS Y NOMBRE", "TELÉFONO", "MÓVIL 1", "MÓVIL 2", "OBSERVACIONES"];
            let tableHTML = "<table><tr><th>Campo</th><th>Valor</th></tr>";

            Object.entries(match).forEach(([key, val]) => {
                if (!excludedColumns.includes(key) && val !== "-") {
                    tableHTML += `<tr><td>${key}</td><td>${val}</td></tr>`;
                }
            });

            tableHTML += "</table>";
            resultDiv.innerHTML = tableHTML;
            pdfButton.style.display = "inline-block";
        } catch (err) {
            console.error("Error:", err);
            resultDiv.innerHTML = "<p style='color:red;'>Error al consultar los datos. Inténtalo más tarde.</p>";
        } finally {
            if (spinner) spinner.style.display = "none";
        }
    });
});

//Script para imprimir los datos recuperados por el buscador por número de registro / expediente a PDF
document.querySelectorAll(".pdf-button").forEach(button => {
    button.addEventListener("click", () => {
        const type = button.id.includes("registro") ? "registro" : "expediente";
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const table = document.querySelector(`#${type}Result table`);
        let initials = type;
        const dateStr = new Date().toLocaleDateString("es-ES").replace(/\//g, "-");

        if (table) {
            Array.from(table.rows).forEach(row => {
                const cells = row.cells;
                if (cells.length === 2 && cells[0].innerText.toUpperCase().includes("INICIALES")) {
                    initials = cells[1].innerText.replace(/\./g, "").toUpperCase();
                }
            });

            doc.setFontSize(18);
            doc.text(`Portal del Alumnado - ${type === "registro" ? "Proceso de Admisión" : "Horarios Provisionales"}`, 10, 20);
            doc.setFontSize(12);
            doc.text(`Consulta realizada el ${dateStr}`, 10, 30);

            let y = 40;
            Array.from(table.rows).forEach((row, idx) => {
                if (idx > 0) {
                    const key = row.cells[0].innerText;
                    const value = row.cells[1].innerText;
                    doc.text(`${key}: ${value}`, 10, y);
                    y += 7;
                }
            });

            doc.save(`${type}-${initials}-${dateStr}.pdf`);
        }
    });
});

//Script para buscar los números de registro aportando NIE/DNI y devolverlos en pantalla y PDF a demanda
document.querySelector("#recuperarForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const dni = document.getElementById("dni").value.trim();
    const resultadoDiv = document.getElementById("resultado");
    const registroElement = document.getElementById("registro");
    const spinner = document.getElementById("dniSpinner");
    const buscarBtn = document.getElementById("buscarBtn");

    resultadoDiv.style.display = "none";
    registroElement.innerHTML = "";

    if (!dni) {
        resultadoDiv.style.display = "block";
        registroElement.innerHTML = "<p style='color:red;'>Por favor, introduce un DNI válido.</p>";
        return;
    }

    spinner.style.display = "block";
    buscarBtn.disabled = true;
    buscarBtn.textContent = "Buscando...";

    try {
        //const res = await fetch(urls.registro);
        //const json = await res.json();
        const json = await fetchSheetData(urls.registro);
	const match = json.find(row => String(row["DNI"]).trim() === dni);

        if (!match) {
            resultadoDiv.style.display = "block";
            registroElement.innerHTML = `<p style='color:red;'>No se encontró ningún registro para el DNI: ${dni}</p>`;
            return;
        }

        const registro = match["Nº. Registro"] || "No disponible";

        resultadoDiv.style.display = "block";

        // Mostrar número de registro
        registroElement.textContent = registro;
        registroElement.style.cursor = "pointer";
        registroElement.title = "Haz clic para copiar";

        // Evento para copiar al portapapeles
        registroElement.onclick = async () => {
            try {
                await navigator.clipboard.writeText(registro);
                alert("Número de registro copiado al portapapeles.");
            } catch (err) {
                console.error("Error al copiar al portapapeles: ", err);
                alert("No se pudo copiar el número de registro. Inténtalo manualmente.");
            }
        };

		// Mostrar el botón existente para descargar PDF
		const downloadBtn = document.getElementById("download-btn");
		downloadBtn.style.display = "inline-block";

		// Definir acción al hacer clic en el botón
		downloadBtn.onclick = () => {
			const { jsPDF } = window.jspdf;
		const doc = new jsPDF();
		
		doc.setFontSize(12);
		doc.text("CPM Alcázar de San Juan Campo de Criptana", 105, 80, null, null, 'center');
		doc.setFontSize(16);
		doc.text("Proceso de admisión 2025-2026", 105, 40, null, null, 'center');
		doc.setFontSize(18);
		doc.text(`Número de registro: ${registro}`, 105, 60, null, null, 'center');

		doc.save("numero_registro.pdf");
	};


    } catch (err) {
        console.error("Error:", err);
        resultadoDiv.style.display = "block";
        registroElement.innerHTML = "<p style='color:red;'>Error al consultar los datos. Inténtalo más tarde.</p>";
    } finally {
        spinner.style.display = "none";
        buscarBtn.disabled = false;
        buscarBtn.textContent = "Buscar";
    }
});
