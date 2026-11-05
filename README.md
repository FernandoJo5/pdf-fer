# PDF Fer — FJ Document Studio

Aplicación web estática para organizar, convertir y editar PDF desde el navegador. Diseño responsivo y tipografía sans-serif. Se puede publicar gratuitamente en GitHub Pages.

## Publicación en GitHub sin afectar FJ QR Studio

1. En GitHub, pulsa **+ → New repository**. Crea un repositorio **público** llamado `pdf-fer`. No utilices el repositorio de tu generador QR.
2. Descomprime el ZIP y sube **todos los archivos de esta carpeta**, incluido `index.html`, al directorio raíz del repositorio (opción **Add file → Upload files**). No subas el ZIP como único archivo.
3. Confirma mediante **Commit changes**.
4. Abre **Settings → Pages → Build and deployment**. Selecciona **Deploy from a branch**, rama **main**, carpeta **/(root)** y pulsa **Save**.
5. Tu página tendrá una dirección como `https://TU-USUARIO.github.io/pdf-fer/`. El enlace suele activarse unos minutos después.
6. Usa HTTPS. Para comprobar la instalación PWA, entra desde Chrome o Edge y usa la opción **Instalar PDF Fer** cuando aparezca.

**Importante:** tu generador QR mantiene su propio `index.html` porque estará en un repositorio diferente.

## Herramientas

32 tarjetas con funciones conectadas. De ellas, 20 usan rutas de procesamiento estándar; 12 se identifican como **Beta** porque sus motores adicionales, calidad de conversión o compatibilidad dependen del documento y del navegador:

- PDF a PowerPoint (páginas convertidas a imágenes, no diapositivas editables)
- PDF a Excel (extracción aproximada de texto y columnas)
- PDF a PDF/A (validar conformidad mediante herramientas independientes)
- Word a PDF, PowerPoint a PDF y Excel a PDF (conversión mediante Ream, puede alterar diseño)
- HTML a PDF (omite scripts, imágenes remotas y hojas de estilo externas)
- Proteger PDF y desbloquear PDF (motor QPDF/WebAssembly; necesitas contraseña para desbloquear)
- Censurar PDF (rasterización y tapado de coincidencias textuales; revisar cada página antes de compartir)
- Resumir con IA (resumen extractivo en español; IA generativa experimental en inglés)
- Traducir PDF (modelo local español↔inglés, sin conservar maquetación)

Las rutas Beta **son experimentales**, no deben considerarse certificadas ni garantizadas sin probarlas con archivos reales. No se promete seguridad para documentos sensibles mediante el procesamiento automático de censura.

### Editor visual

Editar PDF abre un lienzo multipágina. Incluye texto, dibujar a mano, rectángulos, resaltado, cubrir visualmente, insertar imágenes, mover anotaciones, color, tamaño, zoom, deshacer y rehacer, y exportación a un PDF nuevo. No reemplaza internamente el texto original. **Cubrir** no equivale a censura definitiva.

## Conexión y privacidad

- Los archivos seleccionados se procesan en el navegador: no se suben a un servidor gestionado por PDF Fer.
- El sitio requiere internet la primera vez para cargar bibliotecas. Su PWA almacena la interfaz y algunos recursos básicos; **el uso sin conexión es parcial y depende de qué bibliotecas se hayan descargado previamente**. Los modelos de IA pueden exigir una primera descarga considerable.
- Las bibliotecas de terceros se obtienen desde CDN públicos. Se recomienda evaluar permisos, mantenimiento y disponibilidad antes de cualquier uso profesional o comercial.
- Para probar localmente con service worker, usa un servidor HTTP local: `python -m http.server 8000`, entra a `http://localhost:8000` y prueba. El service worker se activa al publicarse bajo HTTPS en GitHub Pages.

## Validaciones recomendadas

Antes de utilizar archivos laborales, contables o de importancia jurídica, prueba con copias: unión de PDF de varias páginas, división por rangos, edición con tildes, conversión desde documentos Office, cifrado y recuperación con contraseña. Compara visualmente el resultado, comprueba número de páginas y tamaño del archivo.

## Archivos principales

- `index.html`: catálogo, búsqueda, modal, procesamiento y estados.
- `editor.js`, `editor.css`: editor visual con anotaciones.
- `brand.css`, `tailwind-local.css`: estilo y diseño sans-serif.
- `icons.js`, `logo.svg`, `icon-192.png`, `icon-512.png`: identidad FJ e iconos.
- `manifest.webmanifest`, `pwa.js`, `sw.js`: instalación PWA y almacenamiento offline.

No requiere bases de datos ni contratación de hosting para un proyecto personal público en GitHub Pages.


## Correcciones 2.1.1 — Firma y QPDF (05/11/2026)

- **Desbloquear / Proteger:** corregida la ruta de WebAssembly de `pdfstudio@0.4.0`. El paquete declara el binario en `dist/wasm/qpdf.wasm`, no en `dist/qpdf.wasm`. El motor todavía requiere conexión inicial para descargar el binario; no se garantiza su funcionamiento hasta probarlo en GitHub Pages.
- **Firmar:** añadidos los controles que faltaban: página (por defecto 1), posición horizontal (62 %) y vertical (80 %). Se comprueba que la página sea un número entero válido.
- **Errores:** mensajes más claros al fallar la carga del motor o cuando la contraseña no permite descifrar el documento.
- **Caché PWA:** nueva versión de caché (`pdf-fer-v2.1.1`), para renovar la aplicación instalada.

**Cómo actualizar:** sustituye los archivos existentes del repositorio `pdf-fer` por estos (como mínimo `index.html`, `sw.js` y `README.md`). No cambies los de FJ QR Studio. Recarga una vez con Ctrl+F5 y, si la PWA sigue mostrando la versión anterior, ciérrala y vuelve a abrirla en línea.

**Prueba con documentos de ejemplo** que no contengan datos bancarios ni contraseñas reales. Se han verificado estáticamente el código y la ruta documentada, no un desbloqueo extremo a extremo en un navegador conectado a los CDN.
