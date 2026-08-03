const fileInput = document.getElementById("file-input");
const borderInput = document.getElementById("border-input");
const ratioInput = document.getElementById("ratio-input");
const colorInput = document.getElementById("color-input");

const sliceHorizontalsInput = document.getElementById("slice-h-input");
const nInput = document.getElementById("n-input");
const nValue = document.getElementById("n-value");

const previewContainer = document.querySelector(".preview-container");

const processBtn = document.getElementById("process-btn");


let loadedImages = [];
let currentCanvases = [];

const RATIO_PRESETS = {
  	"4:5": { w: 1080, h: 1350 },
  	"1:1": { w: 1080, h: 1080 },
  	"3:4": { w: 810, h: 1080 },
  	"4:3": { w: 1080, h: 810 },
  	"9:16": { w: 1080, h: 1920 },
  	"16:9": { w: 1920, h: 1080 },
};


// Function to read the user's config
function readConfig(){
	return {
		targetRatio: ratioInput.value,
		borderWidth: parseInt(borderInput.value),
		borderColor: colorInput.value,
		verticalMode: document.querySelector('input[name="v-mode"]:checked').value,
		horizontalMode: document.querySelector('input[name="h-mode"]:checked').value,
		horizontalSlice: sliceHorizontalsInput.checked,
		n: parseInt(nInput.value)
	}
}

// Function that creates a custom canvas
function createCanvas(w, h){
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	
	return canvas;
}

// Render function: scales the image to fit entirely onto the canvas
function renderFit(img, canvasW, canvasH, b, borderColor, sliceInfo = null){
	const w = img.width;
  	const h = img.height;

  	const imgRatio = w / h;

  	const usableW = canvasW - 2 * b;
  	const usableH = canvasH - 2 * b;
  	const targetRatio = usableW / usableH;

  	let blitW = usableW, blitH = usableH, blitX = b, blitY = b;

  	if (imgRatio > targetRatio) {
  	  	blitH = usableW / imgRatio;
		blitY = b + (usableH - blitH) / 2;
  	} else {
  		blitW = usableH * imgRatio;
		blitX = b + (usableW - blitW) / 2;
  	}

  	const canvas = createCanvas(canvasW, canvasH);
 	const ctx = canvas.getContext("2d");

	ctx.fillStyle = borderColor;
	ctx.fillRect(0, 0, canvasW, canvasH);

	ctx.drawImage(
      		img,
      		0, 0, w, h,
      		blitX, blitY, blitW, blitH
    	);
	
	return canvas;
}

// Render function: crops the image to fit the canvas leaving a uniform border around it
function renderCover(img, canvasW, canvasH, b, borderColor, sliceInfo = null){
	const w = img.width;
  	const h = img.height;

  	const imgRatio = w / h;

  	const usableW = canvasW - 2 * b;
  	const usableH = canvasH - 2 * b;
  	const targetRatio = usableW / usableH;

  	let cropW = w, cropH = h, cropX = 0, cropY = 0;

  	if (imgRatio > targetRatio) {
  	  	cropW = h * targetRatio;
  	  	cropX = (w - cropW) / 2;
  	} else {
  	  	cropH = w / targetRatio;
  		cropY = (h - cropH) / 2;
  	}

  	const canvas = createCanvas(canvasW, canvasH);
  	const ctx = canvas.getContext("2d");

	ctx.fillStyle = borderColor;
	ctx.fillRect(0, 0, canvasW, canvasH);

  	ctx.drawImage(
		img, 
		cropX, cropY, cropW, cropH,
		b, b, usableW, usableH
	);
	
	return canvas;
}

// Function to get canvas size according to output ratio
function getCanvasDimensions(ratioKey, img = null) {
  	if (ratioKey === "original" && img) {

    		const w = 1080;
    		const h = Math.round(w * (img.height / img.width));
    		return { w, h };
  	}
	
  	return RATIO_PRESETS[ratioKey]; // { w, h } già pronto
}

// Function to processes correctly every image
function processImage(img, name, config){
	const w = img.width;
  	const h = img.height;

  	const imgRatio = w / h;
	const horizontal = imgRatio > 1;
	
	const { w: canvasW, h: canvasH } = getCanvasDimensions(config.targetRatio, img);
	let canvases = [];

	if(!horizontal){ // Vertical
		switch(config.verticalMode){
			case "fit":
				canvases.push(renderFit(img, canvasW, canvasH, config.borderWidth, config.borderColor));
				break;
			case "cover":
				canvases.push(renderCover(img, canvasW, canvasH, config.borderWidth, config.borderColor));
				break;
		}
	} else if(!config.horizontalSlice){ // Horizontal, no slice
		switch(config.horizontalMode){
			case "fit":
				canvases.push(renderFit(img, canvasW, canvasH, config.borderWidth, config.borderColor));
				break;
			case "cover":
				canvases.push(renderCover(img, canvasW, canvasH, config.borderWidth, config.borderColor));
				break;
		}
	} else { // Horizontal with slicing

	}

	return canvases;
}

// Function that updates the preview elements
function updatePreview() {
  	const config = readConfig();
  	currentCanvases = [];

  	for (const { img, name } of loadedImages) {
  		const canvases = processImage(img, name, config);
    		canvases.forEach((canvas, i) => {
      			currentCanvases.push({ name: `${name}_${i+1}`, canvas });
    		});
	}

  	renderPreviewToDOM(currentCanvases);
}

// Function to populate the preview section with items
function renderPreviewToDOM(items) {
  	previewContainer.innerHTML = "";

  	items.forEach(({ name, canvas }) => {
    		const thumb = canvas.cloneNode ? canvas : canvas;
   		previewContainer.appendChild(canvas);
  	});
}

// On file input, load the images into the array
fileInput.addEventListener("change", (e) => {
  	const imgPromises = [...e.target.files].map(file => new Promise(resolve => {
    		const img = new Image();
    		img.onload = () => resolve({ img, name: file.name.replace(/\.[^/.]+$/, "") });
    		img.src = URL.createObjectURL(file);
  	}));

 	Promise.all(imgPromises).then(results => {
    		loadedImages = results;
    		updatePreview();
  	});
});

// On settings change, reload the preview


// On "download" button press, zip the files
processBtn.addEventListener("click", () => {
  	const zip = new JSZip();
  	let done = 0;
  	currentCanvases.forEach(({ name, canvas }) => {
  		canvas.toBlob(blob => {
      			zip.file(`${name}.jpg`, blob);
      			done++;
      			if (done === currentCanvases.length) {
       	 			zip.generateAsync({ type: "blob" }).then(content => {
         	 			const a = document.createElement("a");
          				a.href = URL.createObjectURL(content);
          				a.download = "output.zip";
          				a.click();
        			});
      			}
    		}, "image/jpeg", 0.95);
  	});
});
