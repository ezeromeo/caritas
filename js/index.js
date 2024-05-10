async function fetchAndParseXML(url, body, contentType) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': contentType
      },
      body: body
    });
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    return xmlDoc;
  } catch (error) {
    console.error('Error al obtener o analizar XML:', error);
    return null;
  }
}



function extractDatosExtendidos(xmlDoc) {
  const datosExtendidos = {};
  xmlDoc.querySelectorAll('DatosExtendidos Dato').forEach(dato => {
    const nombre = dato.querySelector('nombre').textContent;
    const valor = dato.querySelector('valor') ? dato.querySelector('valor').textContent : '';
    datosExtendidos[nombre] = valor;
  });
  return datosExtendidos;
}


async function combineData() {

  const accionesUrl = 'https://demo.iformalia.es/ws/Exportaciones/Acciones.asmx';
  const accionesBody = `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <GetListAcciones xmlns="http://tempuri.org/">
        <eUsuario>ws_user</eUsuario>
        <ePassword>ws_pass</ePassword>
        <eTipo>demo</eTipo>
        <eFiltros></eFiltros>
      </GetListAcciones>
    </soap12:Body>
  </soap12:Envelope>`;

  const gruposUrl = 'https://demo.iformalia.es/ws/Exportaciones/Grupos.asmx';
  const gruposBody = `<?xml version="1.0" encoding="utf-8"?>
  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <GetListGrupos xmlns="http://tempuri.org/">
        <eUsuario>demo</eUsuario>
        <ePassword>wform_2023</ePassword>
        <eTipo>demo</eTipo>
      </GetListGrupos>
    </soap12:Body>
  </soap12:Envelope>`;


  const accionesXmlDoc = await fetchAndParseXML(accionesUrl, accionesBody, 'text/xml');
  const gruposXmlDoc = await fetchAndParseXML(gruposUrl, gruposBody, 'application/soap+xml');

  if (!accionesXmlDoc || !gruposXmlDoc) {
    console.error('Error al obtener o analizar uno o ambos XML.');
    return;
  }


  const acciones = [...accionesXmlDoc.querySelectorAll('Accion_')].map(accion => ({
    accion: accion.querySelector('Accion').textContent,
    datosExtendidos: extractDatosExtendidos(accion),
    accionId: accion.querySelector('AccionId').textContent,
    accionNombre: accion.querySelector('AccionNombre').textContent,
    horasTotales: accion.querySelector('HorasTotales').textContent,
    horasPresenciales: accion.querySelector('HorasPresenciales').textContent,
    horasTeleformacion: accion.querySelector('HorasTeleformacion').textContent
  }));

  const grupos = [...gruposXmlDoc.querySelectorAll('Grupo_')].map(grupo => ({
    accion: grupo.querySelector('Accion').textContent,
    datosExtendidos: extractDatosExtendidos(grupo),
    grupoId: grupo.querySelector('GrupoId').textContent,
    grupo: grupo.querySelector('Grupo').textContent,
    modalidad: grupo.querySelector('Modalidad').textContent,
    fechaInicio: grupo.querySelector('FechaInicio').textContent,
    fechaFin: grupo.querySelector('FechaFin').textContent
  }));


  const combinedData = [];
  acciones.forEach(accion => {
    const matchingGrupo = grupos.find(grupo => grupo.accion === accion.accion);
    if (matchingGrupo) {
      combinedData.push({
        ...accion,
        ...matchingGrupo,
        datosExtendidos: { ...accion.datosExtendidos, ...matchingGrupo.datosExtendidos }
      });
    }
  });


  console.log(combinedData);
  return combinedData;
}


combineData();



function nombreDelMes(numeroMes) {
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return meses[numeroMes - 1];
}


function crearTarjeta(data) {
  let contenidoFecha = '';

  if (data.fechaInicio) {
    const partesFecha = data.fechaInicio.split("/");
    const dia = partesFecha[0];
    const mes = nombreDelMes(parseInt(partesFecha[1], 10));
    const año = partesFecha[2];

    contenidoFecha = `
            <div class="fechaSpan d-flex align-items-center justify-content-end">
              <span>
                <strong>${dia}</strong>
                <br>${mes}<br>
                ${año}
              </span>
            </div>
          `;
  }

  const imagenSrc = data.datosExtendidos && data.datosExtendidos.ImagenLogoBits
    ? `data:image/jpeg;base64,${data.datosExtendidos.ImagenLogoBits}`
    : "assets/img/card1.jpg";

  return `
          <div class="card-container">
            <div class="card-cursos">
              <div class="d-flex align-items-center justify-content-center">
                <img src="${imagenSrc}" class="card-img-top img-fluid" alt="">
              </div>
              ${contenidoFecha}
              <div class="card-body">
                <h2 class="card-title">${data.accionNombre}</h2>
                <div class="cuerpo d-flex align-items-center justify-content-around">
                  <div class="location d-flex align-items-center justify-content-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-alt mb-3 me-2" viewBox="0 0 16 16">
                      <path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10" />
                      <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
                    </svg>
                    <p>${getModalidadNombre(data.modalidad)}</p>
                    </div>
                </div>
                <div class="card-footer">
                  <p>Más información</p>
                </div>
              </div>
            </div>
          </div>
        `;
}

function getModalidadNombre(codigo) {
  const modalidades = {
    'M': 'Mixta',
    'T': 'Teleformación',
    'P': 'Presencial',
    'D': 'Distancia'
  };
  return modalidades[codigo] || 'Desconocida';
}



document.addEventListener('DOMContentLoaded', () => {
  generateCards();
});

async function generateCards(page = 0) {
  $("#loader").show();
  const combinedData = await combineData();
  const pageSize = 9;
  const paginatedData = paginateData(combinedData, pageSize);

  renderPage(paginatedData, page);
  renderPaginationButtons(paginatedData.length, page);
  $("#loader").hide();
}


function renderPage(paginatedData, page) {
  const contenedor = document.querySelector('.cards');
  if (!contenedor) {
    console.error('El contenedor no fue encontrado. Verifica tu HTML y el selector.');
    $("#loader").hide();
    return;
  }

  contenedor.innerHTML = '';

  if (!paginatedData[page] || paginatedData[page].length === 0) {
    console.error('No hay datos para esta página:', page);
    $("#loader").hide();
    return;
  }

  paginatedData[page].forEach(data => {
    const cardHTML = crearTarjeta(data);
    const div = document.createElement('div');
    div.innerHTML = cardHTML;
    contenedor.appendChild(div);
  });

  $("#loader").hide();
}


function paginateData(data, pageSize) {
  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = [];
  for (let i = 0; i < totalPages; i++) {
    paginatedData.push(data.slice(i * pageSize, (i + 1) * pageSize));
  }
  return paginatedData;
}

function renderPaginationButtons(totalPages, currentPage) {
  const paginationContainer = document.querySelector('.pagination-container');
  if (!paginationContainer) {
    console.error('El contenedor de paginación no fue encontrado. Verifica tu HTML y el selector.');
    return;
  }

  paginationContainer.innerHTML = '';
  const maxVisibleButtons = 4;
  let startPage = Math.max(currentPage - Math.floor(maxVisibleButtons / 2), 0);
  let endPage = startPage + maxVisibleButtons;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(endPage - maxVisibleButtons, 0);
  }


  if (startPage > 0) {
    const button = createPageButton(0, '<<');
    paginationContainer.appendChild(button);
  }


  for (let i = startPage; i < endPage; i++) {
    const button = createPageButton(i, i + 1);
    if (i === currentPage) {
      button.classList.add('active');
    }
    paginationContainer.appendChild(button);
  }


  if (endPage < totalPages) {
    const button = createPageButton(totalPages - 1, '>>');
    paginationContainer.appendChild(button);
  }
}

function createPageButton(page, text) {
  const button = document.createElement('button');
  button.textContent = text;
  button.classList.add('page-button');
  button.addEventListener('click', () => {
    $("#loader").show();
    generateCards(page);
  });
  return button;
}






