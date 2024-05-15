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

  try {
    
    const [accionesXmlDoc, gruposXmlDoc] = await Promise.all([
      fetchAndParseXML(accionesUrl, accionesBody, 'text/xml'),
      fetchAndParseXML(gruposUrl, gruposBody, 'application/soap+xml')
    ]);

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

    return combinedData;
  } catch (error) {
    console.error('Error al obtener o procesar los datos:', error);
  }
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
          <div class="card-container" onclick="window.location.href='curso.html?accionId=${data.accionId}'">
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


async function main() {
  try {
      const combinedData = await combineData(); 
      if (combinedData && combinedData.length > 0) {
          poblarInfoCurso(combinedData);
          $("#loader").hide();
      } else {
          console.error('combinedData está vacío o no se obtuvieron datos.');
          $("#loader").hide();
      }
  } catch (error) {
      console.error('Error al obtener o procesar los datos:', error);
      $("#loader").hide();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  $("#loader").show();

  main();
});

function poblarInfoCurso(datosCurso) {
  const container = document.getElementById('cursoContainer');

  const urlParams = new URLSearchParams(window.location.search);
  const accionId = urlParams.get('accionId');
  const cursoEspecifico = datosCurso.find(curso => curso.accionId === accionId);

  console.log(cursoEspecifico)
  console.log(datosCurso)

  if (!cursoEspecifico) {
    console.error('No se encontró el curso específico');
    return;
  }

  if (!container) return;
  if (!datosCurso) return;

  
  container.innerHTML = '';

  
  const breadcrumbCurso = document.createElement('div');
  breadcrumbCurso.className = 'breadcrumb-curso d-flex align-items-center justify-content-center';
  const centeredTextCurso = document.createElement('div');
  centeredTextCurso.className = 'centered-text-curso';
  const pCurso = document.createElement('p');
  const aInicio = document.createElement('a');
  aInicio.href = '#';
  aInicio.textContent = 'INICIO';
  pCurso.appendChild(aInicio);
  pCurso.append(`/${cursoEspecifico.accionNombre}`);
  centeredTextCurso.appendChild(pCurso);
  breadcrumbCurso.appendChild(centeredTextCurso);
  container.appendChild(breadcrumbCurso);

  
  const divCurso = document.createElement('div');
  divCurso.className = 'curso';

  const divTitulo = document.createElement('div');
  divTitulo.className = 'titulo d-flex align-items-center justify-content-center flex-column mt-2 mb-4';
  const h1Titulo = document.createElement('h1');
  h1Titulo.textContent = cursoEspecifico.accionNombre;
  divTitulo.appendChild(h1Titulo);
  divCurso.appendChild(divTitulo);

  
  const divShare = document.createElement('div');
  divShare.className = 'share d-flex align-items-center justify-content-center';
  
  
  const urlActual = window.location.href;
  const tituloCurso = cursoEspecifico.accionNombre;
  
  ['facebook', 'x', 'linkedin', 'whatsapp', 'printer'].forEach(icon => {
      const divShareImg = document.createElement('div');
      divShareImg.className = 'shareImg d-flex align-items-center justify-content-center';
      const img = document.createElement('img');
      img.src = `assets/img/${icon}.svg`;
      img.alt = icon;
  
      
      divShareImg.onclick = () => {
          switch (icon) {
              case 'facebook':
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlActual)}&t=${encodeURIComponent(tituloCurso)}`, '_blank');
                  break;
              case 'x':
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tituloCurso)}&url=${encodeURIComponent(urlActual)}`, '_blank');
                  break;
              case 'linkedin':
                  window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(urlActual)}&title=${encodeURIComponent(tituloCurso)}`, '_blank');
                  break;
              case 'whatsapp':
                  window.open(`https://wa.me/?text=${encodeURIComponent(tituloCurso + " " + urlActual)}`, '_blank');
                  break;
              case 'printer':
                  window.print();
                  break;
          }
      };
  
      divShareImg.appendChild(img);
      divShare.appendChild(divShareImg);
  });
  divTitulo.appendChild(divShare);
  

  
  const divRowCuerpoCurso = document.createElement('div');
  divRowCuerpoCurso.className = 'row cuerpoCurso';

  
  const colLg8 = document.createElement('div');
  colLg8.className = 'col-lg-8';
 
  const divInfoCurso = document.createElement('div');
  divInfoCurso.className = 'infoCurso';

  const rowInfo = document.createElement('div');
  rowInfo.className = 'row';
  const fechaInscripcionInicio = convertirFecha(cursoEspecifico.datosExtendidos.FechaInscripcionInicio);
  const fechaInscripcionFin = convertirFecha(cursoEspecifico.datosExtendidos.FechaInscripcionFin);

  const infoDetails = [
      { img: 'calendar', subtitle: 'COMIENZA', title: fechaInscripcionInicio },
      { img: 'calendar', subtitle: 'FINALIZA', title: fechaInscripcionFin },
      { svg: 'bi bi-clock', subtitle: 'HORARIO', title: 'A Definir' },
      { svg: 'bi bi-clock-history', subtitle: 'DURACIÓN', title: `${cursoEspecifico.horasTotales} horas` },
  ];

  infoDetails.forEach(info => {
      const colMd6Lg3 = document.createElement('div');
      colMd6Lg3.className = 'col-md-6 col-lg-3 text-center';
      if (info.img) {
          const img = document.createElement('img');
          img.src = `assets/img/${info.img}.png`;
          img.alt = '';
          colMd6Lg3.appendChild(img);
      } else if (info.svg) {
          const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svgIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          svgIcon.setAttribute("width", "16");
          svgIcon.setAttribute("height", "16");
          svgIcon.setAttribute("fill", "currentColor");
          svgIcon.setAttribute("class", info.svg);
          svgIcon.setAttribute("viewBox", "0 0 16 16");
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", "M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z");
          svgIcon.appendChild(path);
          const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path2.setAttribute("d", "M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0");
          svgIcon.appendChild(path2);
          colMd6Lg3.appendChild(svgIcon);
      }
      const pSubtitle = document.createElement('p');
      pSubtitle.className = 'subtitleInfoCurso';
      pSubtitle.textContent = info.subtitle;
      colMd6Lg3.appendChild(pSubtitle);
      const pTitle = document.createElement('p');
      pTitle.className = 'titleInfoCurso';
      pTitle.textContent = info.title;
      colMd6Lg3.appendChild(pTitle);
      rowInfo.appendChild(colMd6Lg3);
  });
  divInfoCurso.appendChild(rowInfo);
  colLg8.appendChild(divInfoCurso);

  
  const divInfoLast = document.createElement('div');
  divInfoLast.className = 'infoLast';
  const rowInfoLast = document.createElement('div');
  rowInfoLast.className = 'row d-flex align-items-center justify-content-start';
  const colMdLg3Last1 = document.createElement('div');
  colMdLg3Last1.className = 'col-md- col-lg-3 d-flex align-items-center justify-content-center flex-column';
  const svgGeo = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgGeo.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svgGeo.setAttribute("width", "16");
  svgGeo.setAttribute("height", "16");
  svgGeo.setAttribute("fill", "currentColor");
  svgGeo.setAttribute("class", "bi bi-geo-alt");
  svgGeo.setAttribute("viewBox", "0 0 16 16");
  const pathGeo = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathGeo.setAttribute("d", "M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10");
  svgGeo.appendChild(pathGeo);
  const pathGeo2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathGeo2.setAttribute("d", "M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6");
  svgGeo.appendChild(pathGeo2);
  colMdLg3Last1.appendChild(svgGeo);
  colMdLg3Last1.appendChild(document.createTextNode(`${getModalidadNombre(cursoEspecifico.modalidad)}`));
  rowInfoLast.appendChild(colMdLg3Last1);

  const colMdLg3Last2 = document.createElement('div');
  colMdLg3Last2.className = 'col-md- col-lg-3 mt-3 euro';
  colMdLg3Last2.textContent = '0 €';
  rowInfoLast.appendChild(colMdLg3Last2);

  divInfoLast.appendChild(rowInfoLast);
  colLg8.appendChild(divInfoLast);

  const divTextoCurso = document.createElement('div');
  divTextoCurso.className = 'textoCurso';
  const h3TextoCurso = document.createElement('h3');
  h3TextoCurso.className = 'h3TextoCurso';
  h3TextoCurso.textContent = 'Descripción';
  divTextoCurso.appendChild(h3TextoCurso);
  const pTextoCurso = document.createElement('p');
  if (cursoEspecifico.datosExtendidos.Descripcion && cursoEspecifico.datosExtendidos.Descripcion.trim() !== '') {
    pTextoCurso.textContent = cursoEspecifico.datosExtendidos.Descripcion;
    divTextoCurso.appendChild(pTextoCurso);
  } else {
    pTextoCurso.textContent = 'Sin especificar';
    divTextoCurso.appendChild(pTextoCurso);
  }
  colLg8.appendChild(divTextoCurso);

  
  const divObjetivos = document.createElement('div');
  divObjetivos.className = 'objetivos';
  const h3Objetivos = document.createElement('h3');
  h3Objetivos.textContent = 'Objetivos';
  divObjetivos.appendChild(h3Objetivos);
if (cursoEspecifico.datosExtendidos.Objetivos && cursoEspecifico.datosExtendidos.Objetivos.trim() !== '') {
  const ulObjetivos = document.createElement('ul');
  cursoEspecifico.datosExtendidos.Objetivos.split('\n').forEach(item => {
      if (item.trim() !== '') {
          const li = document.createElement('li');
          li.textContent = item;
          ulObjetivos.appendChild(li);
      }
  });
  divObjetivos.appendChild(ulObjetivos);
} else {
  const pSinEspecificar = document.createElement('p');
  pSinEspecificar.textContent = 'Sin especificar';
  divObjetivos.appendChild(pSinEspecificar);
}

colLg8.appendChild(divObjetivos);
  
  const divContenidos = document.createElement('div');
  divContenidos.className = 'contenidos';
  const h3Contenidos = document.createElement('h3');
  h3Contenidos.textContent = 'Contenidos';
  divContenidos.appendChild(h3Contenidos);
  
  const partesContenidos = cursoEspecifico.datosExtendidos.Contenidos.split(':');
  if (partesContenidos.length > 1) {

      const pIntroContenidos = document.createElement('p');
      pIntroContenidos.textContent = partesContenidos[0] + ':';
      divContenidos.appendChild(pIntroContenidos);
  

      const ulContenidos = document.createElement('ul');

      partesContenidos[1].trim().split('\n').forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          ulContenidos.appendChild(li);
      });
      divContenidos.appendChild(ulContenidos);
  } else {

      const pSimpleContenidos = document.createElement('p');
      pSimpleContenidos.textContent = cursoEspecifico.datosExtendidos.Contenidos  || 'Sin especificar';
      divContenidos.appendChild(pSimpleContenidos);
  }
  
  colLg8.appendChild(divContenidos);
  divRowCuerpoCurso.appendChild(colLg8);
  
  

  
  const colLg4 = document.createElement('div');
  colLg4.className = 'col-lg-4 segundaColumna d-flex align-items-center justify-content-start flex-column';
  const imgCard1 = document.createElement('img');
  imgCard1.alt = '';
  
  if (cursoEspecifico.datosExtendidos.ImagenCaratulaBits) {
      imgCard1.src = `data:image/jpeg;base64,${cursoEspecifico.datosExtendidos.ImagenCaratulaBits}`;
  } else {
      imgCard1.src = 'assets/img/card1.jpg';
  }
  
  colLg4.appendChild(imgCard1);
  

  const divBox = document.createElement('div');
  divBox.className = 'box d-flex align-items-center justify-content-center flex-column';
  const divInnerBox = document.createElement('div');
  divInnerBox.className = 'd-flex align-items-center justify-content-center flex-column mb-4';
  const svgGeo2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgGeo2.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svgGeo2.setAttribute("width", "16");
  svgGeo2.setAttribute("height", "16");
  svgGeo2.setAttribute("fill", "currentColor");
  svgGeo2.setAttribute("class", "bi bi-geo-alt");
  svgGeo2.setAttribute("viewBox", "0 0 16 16");
  const pathGeo3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathGeo3.setAttribute("d", "M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10");
  svgGeo2.appendChild(pathGeo3);
  const pathGeo4 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathGeo4.setAttribute("d", "M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6");
  svgGeo2.appendChild(pathGeo4);
  divInnerBox.appendChild(svgGeo2);
  divInnerBox.appendChild(document.createTextNode('Presencial'));
  divBox.appendChild(divInnerBox);


const divInscripcion = document.createElement('div');
divInscripcion.className = 'd-flex inscripcion';
const buttonInscripcion = document.createElement('button');
buttonInscripcion.className = 'btn btn-light';
buttonInscripcion.textContent = 'INSCRIPCIÓN';


if (cursoEspecifico.datosExtendidos.EnlaceInscripcion) {
    
    buttonInscripcion.onclick = function() {
      window.open(cursoEspecifico.datosExtendidos.EnlaceInscripcion, '_blank');
    };
} else {
    
    buttonInscripcion.disabled = true;
}

divInscripcion.appendChild(buttonInscripcion);
divBox.appendChild(divInscripcion);



  colLg4.appendChild(divBox);

  divRowCuerpoCurso.appendChild(colLg4);

  divCurso.appendChild(divRowCuerpoCurso);

  container.appendChild(divCurso);
}
function convertirFecha(fechaStr) {
  if (!fechaStr || fechaStr.trim() === '') {
      return "A Definir";
  }

  const partes = fechaStr.split('/');
  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  const año = parseInt(partes[2], 10);

  const nombreMes = nombreDelMes(mes);
  return `${dia} de ${nombreMes} de ${año}`;
}
