// ========== DOM ==========
const $ = (id) => document.getElementById(id);

const topbar = document.querySelector(".topbar");
const home = $("home");
const appSection = document.querySelector(".app-section");
const previewContainer = document.querySelector(".preview-container");

const dropZone = $("drop-zone");
const heroUpload = $("hero-upload");
const mobileUpload = $("mobile-upload");

const borderInput = $("border-input");
const ratioInput = $("ratio-input");
const colorInput = $("color-input");
const sliceHorizontalsInput = $("slice-h-input");
const nInput = $("n-input");
const nValue = $("n-value");
const processBtn = $("process-btn");

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.multiple = true;
fileInput.accept = "image/*";

// ========== State ==========
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

// ========== Config ==========
function readConfig() {
	return {
		targetRatio: ratioInput.value,
		borderWidth: Math.max(0, parseInt(borderInput.value) || 0),
		borderColor: colorInput.value,
		verticalMode: document.querySelector('input[name="v-mode"]:checked').value,
		horizontalMode: document.querySelector('input[name="h-mode"]:checked').value,
		horizontalSlice: sliceHorizontalsInput.checked,
		n: parseInt(nInput.value),
	};
}

function getCanvasDimensions(ratioKey, img) {
	if (ratioKey === "original") {
		const w = 1080;
		return { w, h: Math.round(w * (img.height / img.width)) };
	}
	return RATIO_PRESETS[ratioKey];
}

// ========== Rendering ==========
function createCanvas(w, h, fill) {
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;

	const ctx = canvas.getContext("2d");
	ctx.fillStyle = fill;
	ctx.fillRect(0, 0, w, h);

	return { canvas, ctx };
}

// Scales the image to fit entirely inside the canvas (no crop, borders may be asymmetric)
function renderFit(img, canvasW, canvasH, b, borderColor) {
	const usableW = canvasW - 2 * b;
	const usableH = canvasH - 2 * b;
	const imgRatio = img.width / img.height;

	let blitW = usableW, blitH = usableH, blitX = b, blitY = b;

	if (imgRatio > usableW / usableH) {
		blitH = usableW / imgRatio;
		blitY = b + (usableH - blitH) / 2;
	} else {
		blitW = usableH * imgRatio;
		blitX = b + (usableW - blitW) / 2;
	}

	const { canvas, ctx } = createCanvas(canvasW, canvasH, borderColor);
	ctx.drawImage(img, 0, 0, img.width, img.height, blitX, blitY, blitW, blitH);

	return canvas;
}

// Crops the image to fill the canvas, leaving a uniform border
function renderCover(img, canvasW, canvasH, b, borderColor) {
	const w = img.width;
	const h = img.height;
	const usableW = canvasW - 2 * b;
	const usableH = canvasH - 2 * b;
	const targetRatio = usableW / usableH;

	let cropW = w, cropH = h, cropX = 0, cropY = 0;

	if (w / h > targetRatio) {
		cropW = h * targetRatio;
		cropX = (w - cropW) / 2;
	} else {
		cropH = w / targetRatio;
		cropY = (h - cropH) / 2;
	}

	const { canvas, ctx } = createCanvas(canvasW, canvasH, borderColor);
	ctx.drawImage(img, cropX, cropY, cropW, cropH, b, b, usableW, usableH);

	return canvas;
}

// Adds a plain border around the original image, ignoring the target ratio
function renderAdd(img, b, borderColor) {
	const { canvas, ctx } = createCanvas(img.width + 2 * b, img.height + 2 * b, borderColor);
	ctx.drawImage(img, b, b);

	return canvas;
}

const RENDERERS = { fit: renderFit, cover: renderCover };

// Splits one wide render across N canvases that share a continuous border
function renderSplit(img, canvasW, canvasH, n, mode, b, borderColor) {
	const bigCanvas = RENDERERS[mode](img, n * canvasW, canvasH, b, borderColor);
	const canvases = [];

	for (let i = 0; i < n; i++) {
		const { canvas, ctx } = createCanvas(canvasW, canvasH, borderColor);
		ctx.drawImage(bigCanvas, i * canvasW, 0, canvasW, canvasH, 0, 0, canvasW, canvasH);
		canvases.push(canvas);
	}

	return canvases;
}

function renderSingle(img, mode, canvasW, canvasH, config) {
	if (mode === "add") return renderAdd(img, config.borderWidth, config.borderColor);
	return RENDERERS[mode](img, canvasW, canvasH, config.borderWidth, config.borderColor);
}

function processImage(img, config) {
	const horizontal = img.width > img.height;
	const { w: canvasW, h: canvasH } = getCanvasDimensions(config.targetRatio, img);

	if (horizontal && config.horizontalSlice) {
		return renderSplit(img, canvasW, canvasH, config.n, config.horizontalMode, config.borderWidth, config.borderColor);
	}

	const mode = horizontal ? config.horizontalMode : config.verticalMode;
	return [renderSingle(img, mode, canvasW, canvasH, config)];
}

// ========== Preview ==========
function updatePreview() {
	const config = readConfig();
	currentCanvases = [];

	for (const { img, name } of loadedImages) {
		processImage(img, config).forEach((canvas, i) => {
			canvas.classList.add("preview-item");
			currentCanvases.push({ name: `${name}_${i + 1}`, canvas });
		});
	}

	previewContainer.replaceChildren(...currentCanvases.map(({ canvas }) => canvas));
}

// ========== Upload ==========
function handleFiles(files) {
	const imgPromises = [...files]
		.filter((file) => file.type.startsWith("image/"))
		.map((file) => new Promise((resolve) => {
			const img = new Image();
			const url = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(url);
				resolve({ img, name: file.name.replace(/\.[^/.]+$/, "") });
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				resolve(null);
			};
			img.src = url;
		}));

	Promise.all(imgPromises).then((results) => {
		loadedImages = results.filter(Boolean);
		if (!loadedImages.length) return;
		showAppSection();
		updatePreview();
	});
}

function openFilePicker() {
	fileInput.value = ""; // Forces the "change" event even for the same files
	fileInput.click();
}

function showAppSection() {
	home.hidden = true;
	appSection.hidden = false;
	topbar.classList.add("app-variant");
	window.scrollTo({ top: 0, behavior: "instant" });
}

fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

heroUpload.addEventListener("click", (e) => {
	e.preventDefault();
	openFilePicker();
});

mobileUpload.addEventListener("click", openFilePicker);
mobileUpload.addEventListener("keydown", (e) => {
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		openFilePicker();
	}
});

dropZone.addEventListener("dragover", (e) => {
	e.preventDefault();
	dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

dropZone.addEventListener("drop", (e) => {
	e.preventDefault();
	dropZone.classList.remove("dragover");
	handleFiles(e.dataTransfer.files);
});

// ========== Settings ==========
function updateSlider() {
	nInput.disabled = !sliceHorizontalsInput.checked;
}

// Slicing makes no sense in "add" mode (no target frame to divide)
function updateSliceAvailability() {
	const isAdd = document.querySelector('input[name="h-mode"]:checked').value === "add";
	sliceHorizontalsInput.disabled = isAdd;
	if (isAdd) sliceHorizontalsInput.checked = false;
	nInput.disabled = isAdd;
	updateSlider();
}

nInput.addEventListener("input", (e) => {
	nValue.textContent = e.target.value;
});

sliceHorizontalsInput.addEventListener("change", updateSlider);

[sliceHorizontalsInput, nInput, colorInput, ratioInput, borderInput].forEach((input) => {
	input.addEventListener("change", updatePreview);
});

document.querySelectorAll('input[name="v-mode"], input[name="h-mode"]').forEach((input) => {
	input.addEventListener("change", () => {
		updatePreview();
		updateSliceAvailability();
	});
});

// ========== Download ==========
const canvasToBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));

processBtn.addEventListener("click", async () => {
	if (!currentCanvases.length) return;

	const label = processBtn.querySelector("span");
	processBtn.disabled = true;
	label.textContent = "Preparing...";

	try {
		const zip = new JSZip();
		const blobs = await Promise.all(currentCanvases.map(({ canvas }) => canvasToBlob(canvas)));
		currentCanvases.forEach(({ name }, i) => zip.file(`${name}.jpg`, blobs[i]));

		const content = await zip.generateAsync({ type: "blob" });
		const url = URL.createObjectURL(content);
		const a = document.createElement("a");
		a.href = url;
		a.download = "output.zip";
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	} finally {
		processBtn.disabled = false;
		label.textContent = "Download ZIP";
	}
});

// ========== PWA ==========
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
