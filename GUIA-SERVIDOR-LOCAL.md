# Cómo abrir la web NovaCore en tu computadora

Esta guía es para personas que no programan. Sigue los pasos en orden.

La web tiene que funcionar a través de un pequeño **servidor local**: un programa que se queda
abierto en una ventana negra mientras usas la página. No basta con abrir `index.html` con
doble clic, porque así la página se queda en blanco.

---

## Paso 0: instalar Node.js (solo la primera vez)

1. Entra en **https://nodejs.org**.
2. Pulsa el botón verde que dice **LTS** para descargar el instalador.
3. Abre el archivo descargado y pulsa **Siguiente** en todas las pantallas, sin cambiar nada,
   hasta llegar a **Finalizar**.
4. **Reinicia la computadora.** Así Windows reconoce el programa recién instalado.

> Si en tu equipo ya habías instalado Node.js, salta este paso.

## Paso 1: descomprimir el proyecto

1. Busca el archivo **`novacore-mision.zip`**.
2. Haz clic derecho sobre él → **Extraer todo…** → **Extraer**.
3. Se crea una carpeta llamada `novacore-mision`. Ábrela.

## Paso 2: arrancar la web

### Forma fácil (recomendada)

1. Dentro de la carpeta `novacore-mision`, haz **doble clic en `INICIAR.bat`**.
2. Se abre una ventana negra.
   - **La primera vez** tarda entre 1 y 2 minutos, porque descarga las piezas necesarias.
     Es normal ver mucho texto.
   - Las siguientes veces arranca en pocos segundos.
3. El navegador se abre solo con la página. Si no se abre, entra a mano en:
   **http://localhost:5173**

> Si Windows muestra un aviso azul que dice "Windows protegió su PC", pulsa
> **Más información** y después **Ejecutar de todas formas**. Ese aviso sale con cualquier
> archivo `.bat` descargado.

### Forma manual (si la fácil no funciona)

1. Abre la carpeta `novacore-mision` en el Explorador de archivos.
2. Haz clic en la **barra de direcciones** de arriba (donde aparece la ruta de la carpeta),
   borra lo que haya, escribe **`cmd`** y pulsa **Enter**. Se abre una ventana negra ya situada
   en esa carpeta.
3. Escribe esto y pulsa Enter (solo la primera vez):
   ```
   npm install
   ```
4. Cuando termine, escribe esto y pulsa Enter:
   ```
   npx vite
   ```
5. Abre el navegador y entra en **http://localhost:5173**.

## Mientras usas la página

- **No cierres la ventana negra.** Esa ventana es el servidor; si la cierras, la página deja de funcionar.
- Puedes minimizarla.

## Para apagar el servidor

- Cierra la ventana negra con la **X**, o
- haz clic dentro de ella, pulsa **Ctrl + C** y, si te pregunta, escribe **S** y pulsa Enter.

Para volver a usar la web otro día, repite solo el **Paso 2**.

---

## Problemas frecuentes

| Lo que ves | Qué hacer |
|---|---|
| "No se encontró Node.js" o "npm no se reconoce como un comando" | Node.js no está instalado o falta reiniciar. Repite el **Paso 0** y reinicia. |
| La ventana negra se abre y se cierra de golpe | Usa la **forma manual** para poder leer el mensaje de error. |
| "Port 5173 is in use" o la dirección es otra (5174, 5175…) | Ya hay otra copia funcionando o el puerto está ocupado. Abre la dirección `http://localhost:…` que aparece en la ventana negra. |
| La página está en blanco | Asegúrate de entrar por **http://localhost:5173** y no abriendo `index.html` con doble clic. |
| Error al descargar durante `npm install` | Revisa tu conexión a internet y vuelve a intentarlo. |
| Quiero empezar la misión de cero | En la página, abre el menú ☰ (arriba a la derecha) y pulsa **Reiniciar**. |

## En Mac

1. Instala Node.js desde https://nodejs.org (botón **LTS**).
2. Descomprime el zip con doble clic.
3. Abre la app **Terminal**, escribe `cd ` (con un espacio al final), **arrastra la carpeta
   `novacore-mision` a la ventana** y pulsa Enter.
4. Escribe `npm install` y pulsa Enter (solo la primera vez).
5. Escribe `npx vite` y pulsa Enter, y abre **http://localhost:5173**.
6. Para apagar el servidor, pulsa **Ctrl + C** en la Terminal.
