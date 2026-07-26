const inputFiles = document.getElementById("file-input");
const inputBorder = document.getElementById("border-input");
const inputN = document.getElementById("n-input");
const spanN = document.getElementById("n-value");
const processBtn = document.getElementById("process-btn");

const CANVAS_W = 1080
const CANVAS_H = 1350

const zip = new JSZip();
let filesProcessed = 0;
let totalFiles = 0;
let loadedImages = [];

function createCanvas(w, h){
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	
	return canvas;
}

function addBorderToImg(img, originalName, zip, onSlideDone) {
  const w = img.width;
  const h = img.height;
  const b = parseInt(inputBorder.value);

  const imgRatio = w / h;
  const horizontal = imgRatio > 1;
  const N = horizontal ? parseInt(inputN.value) : 1;

  const canvasW = CANVAS_W;
  const totalW = N * canvasW;
  const usableW = totalW - 2 * b;
  const usableH = CANVAS_H - 2 * b;
  const targetRatio = usableW / usableH;

  let cropW = w, cropH = h, cropX = 0, cropY = 0;
  if (imgRatio > targetRatio) {
    cropW = h * targetRatio;
    cropX = (w - cropW) / 2;
  } else {
    cropH = w / targetRatio;
    cropY = (h - cropH) / 2;
  }

  const bigCanvas = createCanvas(usableW, usableH);
  const bigCtx = bigCanvas.getContext("2d");
  bigCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, usableW, usableH);

  for (let i = 0; i < N; i++) {
    const canvas = createCanvas(canvasW, CANVAS_H);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasW, CANVAS_H);

    const leftBorder = (i === 0) ? b : 0;
    const rightBorder = (i === N - 1) ? b : 0;
    const destW = canvasW - leftBorder - rightBorder;
    const destX = leftBorder;

    const sliceStartInBig = i * canvasW - b;
    const sx = Math.max(0, sliceStartInBig);

    ctx.drawImage(
      bigCanvas,
      sx, 0, destW, usableH,
      destX, b, destW, usableH
    );

    canvas.toBlob((blob) => {
      const filename = `${originalName}_slide_${i + 1}.jpg`;
      zip.file(filename, blob);
      onSlideDone();
    }, "image/jpeg", 0.95);
  }
}

function checkIfDone() {
  if (filesProcessed === totalFiles) {
    zip.generateAsync({ type: "blob" }).then((content) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "output.zip";
      a.click();
    });
  }
}

inputFiles.addEventListener("change", (e) => {
  const files = e.target.files;
  loadedImages = [];

  const imgPromises = [];
  for (const file of files) {
    imgPromises.push(new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img, name: file.name.replace(/\.[^/.]+$/, "") });
      img.src = URL.createObjectURL(file);
    }));
  }

  Promise.all(imgPromises).then((results) => {
    loadedImages = results;
    processBtn.disabled = false;
  });
});

processBtn.addEventListener("click", () => {
  if (loadedImages.length === 0) return;

  const zip = new JSZip();
  let filesProcessed = 0;
  const totalFiles = loadedImages.reduce((sum, { img }) => {
  	const horizontal = img.width / img.height > 1;
  	const n = horizontal ? parseInt(inputN.value) : 1;
  	return sum + n;
  }, 0);

  function checkIfDone() {
    if (filesProcessed === totalFiles) {
      zip.generateAsync({ type: "blob" }).then((content) => {
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "output.zip";
        a.click();
      });
    }
  }

  loadedImages.forEach(({ img, name }) => {
    addBorderToImg(img, name, zip, () => {
      filesProcessed++;
      checkIfDone();
    });
  });
});

inputN.addEventListener("input", (e) => {
  spanN.textContent = e.target.value;
});