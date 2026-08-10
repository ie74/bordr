const heroSection = document.querySelector(".hero-container");
const appSection = document.querySelector(".app-section");

const dropZone = document.getElementById("drop-zone");
const heroUpload = document.getElementById("hero-upload");

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.multiple = true;
fileInput.accept = "image/*";

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

appSection.style.display = 'none';

// Function to read the user's config
function readConfig() {
	return {
		targetRatio: ratioInput.value,
		borderWidth: Math.max(0, parseInt(borderInput.value) || 0),
		borderColor: colorInput.value,
		verticalMode: document.querySelector('input[name="v-mode"]:checked').value,
		horizontalMode: document.querySelector('input[name="h-mode"]:checked').value,
		horizontalSlice: sliceHorizontalsInput.checked,
		n: parseInt(nInput.value)
	}
}

// Function that creates a custom canvas
function createCanvas(w, h) {
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;

	return canvas;
}

// Render function: scales the image to fit entirely onto the canvas
function renderFit(img, canvasW, canvasH, b, borderColor, sliceInfo = null) {
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
function renderCover(img, canvasW, canvasH, b, borderColor, sliceInfo = null) {
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

// Render function: adds a simple border around the image
function renderAdd(img, b, borderColor, sliceInfo = null) {
	const w = img.width;
	const h = img.height;

	const canvasW = w + 2 * b;
	const canvasH = h + 2 * b;

	const canvas = createCanvas(canvasW, canvasH);
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = borderColor;
	ctx.fillRect(0, 0, canvasW, canvasH);

	ctx.drawImage(
		img,
		0, 0, w, h,
		b, b, w, h
	);

	return canvas;
}

// Render function: splits a horizontal image across N canvases with a shared border
function renderSplit(img, canvasW, canvasH, n, mode, b, borderColor) {
	const totalW = n * canvasW;

	let bigCanvas;
	if (mode === "fit") {
		bigCanvas = renderFit(img, totalW, canvasH, b, borderColor);
	} else if (mode === "cover") {
		bigCanvas = renderCover(img, totalW, canvasH, b, borderColor);
	}

	const canvases = [];
	for (let i = 0; i < n; i++) {
		const canvas = createCanvas(canvasW, canvasH);
		const ctx = canvas.getContext("2d");

		ctx.fillStyle = borderColor;
		ctx.fillRect(0, 0, canvasW, canvasH);

		const hasLeftBorder = i === 0;
		const hasRightBorder = i === n - 1;

		const sx = i * canvasW;
		const sliceW = canvasW;

		const destX = 0;
		const destW = canvasW;

		ctx.drawImage(
			bigCanvas,
			sx, 0, sliceW, canvasH,
			destX, 0, destW, canvasH
		);

		canvases.push(canvas);
	}

	return canvases;
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
function processImage(img, name, config) {
	const w = img.width;
	const h = img.height;

	const imgRatio = w / h;
	const horizontal = imgRatio > 1;

	const { w: canvasW, h: canvasH } = getCanvasDimensions(config.targetRatio, img);
	let canvases = [];

	if (!horizontal) { // Vertical
		switch (config.verticalMode) {
			case "fit":
				canvases.push(renderFit(img, canvasW, canvasH, config.borderWidth, config.borderColor));
				break;
			case "cover":
				canvases.push(renderCover(img, canvasW, canvasH, config.borderWidth, config.borderColor));
				break;
			case "add":
				canvases.push(renderAdd(img, config.borderWidth, config.borderColor));
				break;
		}
	} else if (!config.horizontalSlice) { // Horizontal, no slice
		switch (config.horizontalMode) {
			case "fit":
				canvases.push(renderFit(img, canvasW, canvasH, config.borderWidth, config.borderColor));
				break;
			case "cover":
				canvases.push(renderCover(img, canvasW, canvasH, config.borderWidth, config.borderColor));
				break;
			case "add":
				canvases.push(renderAdd(img, config.borderWidth, config.borderColor));
				break;
		}
	} else { // Horizontal with slicing
		canvases = renderSplit(img, canvasW, canvasH, config.n, config.horizontalMode, config.borderWidth, config.borderColor);
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
			currentCanvases.push({ name: `${name}_${i + 1}`, canvas });
		});
	}

	renderPreviewToDOM(currentCanvases);
}

// Function to populate the preview section with items
function renderPreviewToDOM(items) {
	previewContainer.innerHTML = "";

	items.forEach(({ name, canvas }) => {
		const thumb = canvas.cloneNode ? canvas : canvas;
		canvas.classList.add("preview-item");
		previewContainer.appendChild(canvas);
	});
}

// Function that handles the uploaded files
function handleFiles(files) {
	const imgPromises = [...files].map(file => new Promise(resolve => {
		const img = new Image();
		img.onload = () => resolve({ img, name: file.name.replace(/\.[^/.]+$/, "") });
		img.src = URL.createObjectURL(file);
	}));

	Promise.all(imgPromises).then(results => {
		loadedImages = results;
		showAppSection();
		updatePreview();
	});
}

// On file input, load the images into the array
fileInput.addEventListener("change", (e) => {
	handleFiles(e.target.files);
});

// Open the file picker
function openFilePicker() {
	fileInput.value = ""; // Forces the "change" update
	fileInput.click();
}

// Drop zone
dropZone.addEventListener("dragover", (e) => {
	e.preventDefault();
	dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
	dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
	e.preventDefault();
	dropZone.classList.remove("dragover");
	const files = e.dataTransfer.files;
	handleFiles(files);
});

// Hero upload
heroUpload.addEventListener("click", () => {
	openFilePicker();
})

// Function that hides everything and shows the settings
function showAppSection() {
	heroSection.style.display = 'none';
	appSection.style.display = '';
}

// Change the label of the n slider
nInput.addEventListener("input", (e) => {
	nValue.textContent = e.target.value;
});

// Function to disable the slice functionality
function updateSliceAvailability() {
	const isAdd = document.querySelector('input[name="h-mode"]:checked').value === "add";
	sliceHorizontalsInput.disabled = isAdd;
	nInput.disabled = isAdd;
}

// On settings change, reload the preview
[sliceHorizontalsInput, nInput, colorInput, ratioInput, borderInput].forEach((input) => {
	input.addEventListener("change", updatePreview);
});

document.querySelectorAll('input[name="v-mode"], input[name="h-mode"]').forEach(input => {
	input.addEventListener("change", () => {
		updatePreview();
		updateSliceAvailability();
	});
});

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
