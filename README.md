# Bordr

**Frame it right. Every time.**

Bordr adds clean, uniform borders to your photos before you post them. It resizes to the right Instagram ratio, keeps the border consistent, and can slice a wide photo into a seamless carousel. Everything runs in your browser: no account, no upload, no backend.

> **Live app:** https://bordr.vercel.app/

---

## Table of contents

- [Features](#features)
- [How to use it](#how-to-use-it)
- [Modes explained](#modes-explained)
- [Target ratios and output sizes](#target-ratios-and-output-sizes)
- [Seamless carousels](#seamless-carousels)
- [Install as an app (PWA)](#install-as-an-app-pwa)
- [Privacy](#privacy)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Run it locally](#run-it-locally)
- [Deploy to GitHub Pages](#deploy-to-github-pages)
- [How the rendering works](#how-the-rendering-works)
- [PWA and caching notes](#pwa-and-caching-notes)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Credits](#credits)

---

## Features

- **Batch processing.** Drop one photo or many; every photo gets the same settings.
- **Separate modes for vertical and horizontal photos**, so a mixed batch still comes out right.
- **Three framing modes:** Fit, Cover and Add (see [Modes explained](#modes-explained)).
- **Configurable border:** any width in pixels and any color (white by default).
- **Target ratios:** 4:5, 1:1, 3:4, 4:3, 16:9, 9:16, or the original ratio of each photo.
- **Seamless carousel slicing:** split a horizontal photo into 2 to 5 frames that line up when swiped.
- **Live preview** that updates on every change, with horizontal scrolling for long carousels.
- **One-click ZIP download** of high-quality JPEGs (quality 0.95).
- **Drag & drop** on desktop, tap-to-upload on touch devices.
- **Installable PWA** with offline support after the first visit.
- **Zero build step.** Plain HTML, CSS and JavaScript.

## How to use it

1. **Upload.** Drag your photos onto the drop zone, or use *upload files*. On touch devices, tap the upload area.
2. **Adjust.** Choose the border width, border color and target ratio. Then pick a mode for vertical photos and one for horizontal photos. Optionally enable *Split horizontals* and choose the number of slices.
3. **Check the preview.** It re-renders whenever a setting changes. Scroll it sideways if you have many frames.
4. **Download.** Press *Download ZIP*. Each frame is saved as `<original-name>_<n>.jpg`, where `n` is the frame number (`1` for photos that are not split).

## Modes explained

Each orientation has its own mode. Border width, border color and target ratio are shared.

| Mode | What it does | Crops the photo? | Border |
| --- | --- | --- | --- |
| **Fit** | Scales the whole photo to fit inside the target ratio. | No | Can be wider on two sides, because the photo's ratio rarely matches the target. |
| **Cover** | Fills the target frame and crops the excess from the center. | Yes | Exactly the same on all four sides. |
| **Add** | Ignores the target ratio and wraps the original photo in a border. | No | Uniform. The output keeps the photo's own dimensions plus the border. |

Tip: a photo with *no border* is just **Cover** with the border width set to `0`.

## Target ratios and output sizes

Frames are rendered on a canvas with a fixed width, so output files are consistent regardless of the source resolution.

| Ratio | Output size (px) | Typical use |
| --- | --- | --- |
| 4:5 | 1080 × 1350 | Instagram portrait (default) |
| 1:1 | 1080 × 1080 | Square post |
| 3:4 | 810 × 1080 | Portrait |
| 4:3 | 1080 × 810 | Landscape |
| 9:16 | 1080 × 1920 | Stories / Reels |
| 16:9 | 1920 × 1080 | Widescreen |
| Original | 1080 × (1080 × H/W) | Keeps each photo's own ratio |

*Add* mode is the exception: it keeps the source resolution and adds the border on top.

## Seamless carousels

When *Split horizontals* is on, a horizontal photo is cut into **N** frames (2 to 5), each the size of the chosen ratio. Post them as a carousel, in order, and swiping from one slide to the next looks like panning across a single wide image.

Under the hood Bordr renders one wide canvas of `N × frameWidth` by `frameHeight`, applying the border to the whole panorama, then cuts it into N equal slices. This is why the border is continuous across slides: only the outer edges of the first and last frame carry the vertical border.

Splitting is disabled in **Add** mode, because that mode has no target frame to divide. It works with both **Fit** and **Cover**.

## Install as an app (PWA)

Bordr ships with a web app manifest and a service worker.

- **Desktop (Chrome, Edge):** click the install icon in the address bar.
- **Android (Chrome):** menu, then *Install app* or *Add to Home Screen*.
- **iOS (Safari):** Share, then *Add to Home Screen*.

Once installed it opens in its own window and keeps working offline after the first load.

## Privacy

- Photos are processed **locally** with the Canvas API and are never uploaded.
- No cookies, no analytics, no tracking.
- Google Fonts and jsDelivr (for icons) are loaded from their CDNs, and cdnjs serves JSZip. Like any web request, these providers can see your IP address. The service worker caches them after the first visit.
- Canvas export drops EXIF metadata (including GPS location) from the output files.

## Tech stack

| Piece | Purpose |
| --- | --- |
| HTML / CSS / vanilla JavaScript | The whole app, no framework, no bundler |
| Canvas API | Cropping, scaling, bordering and slicing |
| [JSZip](https://stuk.github.io/jszip/) 3.10.1 | Building the ZIP in the browser |
| [Bootstrap Icons](https://icons.getbootstrap.com/) 1.13.1 | Icons |
| Google Fonts | Sora, Raleway, Merriweather |
| Service Worker + Web App Manifest | Offline use and installability |

## Project structure

```
bordr/
├── index.html      Markup: landing, how-to, app UI, footer
├── style.css       All styling, built on a small set of CSS variables
├── script.js       App logic: rendering, preview, upload, ZIP, SW registration
├── manifest.json   PWA manifest (name, colors, icons)
├── sw.js           Service worker (stale-while-revalidate cache)
├── favicon.svg     Favicon and PWA icon
└── README.md
```

## Run it locally

There is nothing to install or build. Because service workers only work on `localhost` or HTTPS, serve the folder with any static server instead of opening the file directly:

```bash
# Python
python -m http.server 8000

# or Node
npx serve .
```

Then open http://localhost:8000.

## Deploy to GitHub Pages

1. Push the files to the root of the repository (or a `docs/` folder).
2. In the repository, go to **Settings → Pages**.
3. Under *Build and deployment*, choose **Deploy from a branch**, select your branch and the `/ (root)` folder (or `/docs`), and save.
4. Wait a minute and the site appears at `https://<username>.github.io/<repo>/`.

All paths in the project are relative, so it works from a subpath without changes. It also deploys as-is to Netlify, Cloudflare Pages or any static host.

## How the rendering works

All renderers live in `script.js` and share the same idea: draw a background filled with the border color, then draw the image on top.

With border width `b`, canvas size `W × H`, and usable area `uW = W − 2b`, `uH = H − 2b`:

- **Fit.** Compare the image ratio with `uW / uH`. If the image is wider, its width becomes `uW` and it is centered vertically; otherwise its height becomes `uH` and it is centered horizontally. No pixels are discarded.
- **Cover.** The source is cropped to the ratio `uW / uH`, centered, and drawn into the usable area at offset `(b, b)`. The border is `b` on every side.
- **Add.** The canvas is `(w + 2b) × (h + 2b)` and the image is drawn at `(b, b)` at its native size.
- **Split.** A wide canvas of `N × W` is rendered with Fit or Cover, then N canvases of `W × H` are created, each copying its slice with `drawImage`.

Photos are classified as horizontal when `width > height`; everything else (including squares) uses the vertical settings. Output is JPEG at quality 0.95.

## PWA and caching notes

- `sw.js` uses **stale-while-revalidate**: the cached version is served instantly and refreshed in the background, so updates appear on the *next* load.
- **When you change any file, bump `CACHE_VERSION` in `sw.js`.** Otherwise returning visitors may keep seeing the old files from cache for a while.
- For the best installation experience on Android, add **PNG icons (192×192 and 512×512)** to the `icons` array in `manifest.json` alongside `favicon.svg`.
- For fully reliable offline use, consider hosting JSZip in the repository instead of loading it from a CDN.

## Known limitations

- Very large photos, or wide splits at large ratios, can hit the canvas size limits of some mobile browsers (notably older iOS Safari). If a render fails, try fewer slices or a smaller ratio.
- Cover mode always crops from the center; manual repositioning is not available yet.
- All photos in a batch share the same settings.
- Output is JPEG only, and metadata is not preserved.

## Roadmap

- [ ] Manual crop offset (horizontal and vertical) instead of always centering
- [ ] Persist settings between sessions with `localStorage`
- [ ] Per-photo settings within the same batch
- [ ] Self-hosted JSZip for fully offline use
- [ ] PNG icons for the PWA

## Contributing

Bordr is open source and contributions are welcome.

1. Fork the repository and create a branch (`git checkout -b feature/my-change`).
2. Keep it dependency-free: plain HTML, CSS and JavaScript.
3. Test in at least one desktop and one mobile browser, with both vertical and horizontal photos.
4. Open a pull request describing what changed and why.

Found a bug or have an idea? Please open an issue and include your browser, the settings you used and, if possible, the ratio of the photo that caused it.

## License

Add the license of your choice here (for example MIT) and include a `LICENSE` file in the repository.

## Credits

Made by [ie74](https://ie74.github.io).

Thanks to the authors of JSZip, Bootstrap Icons and the Sora, Raleway and Merriweather typefaces.

Instagram is a trademark of Meta Platforms, Inc. Bordr is not affiliated with or endorsed by Meta.
