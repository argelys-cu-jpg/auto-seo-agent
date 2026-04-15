"use client";

import type { CSSProperties, ChangeEvent, DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AnalysisResult = {
  crop: CropRect;
  rationale: string;
};

type ProcessedImage = {
  id: string;
  sourceLabel: string;
  sourceUrl: string;
  croppedUrl: string;
  description: string;
  fileName: string;
  details: string;
};

type MarkdownImageCandidate = {
  id: string;
  src: string;
  description: string;
};

type DiscoveryResponse = {
  pageTitle: string;
  images: MarkdownImageCandidate[];
};

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 600;
const TARGET_ASPECT = OUTPUT_WIDTH / OUTPUT_HEIGHT;
const MAX_ANALYSIS_EDGE = 96;

export function ImageCropperTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const processedRef = useRef<ProcessedImage[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [status, setStatus] = useState("Paste a blog URL, drag images in, or use markdown fallback to generate 1200 x 600 crops.");
  const [details, setDetails] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [markdownInput, setMarkdownInput] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [batchLabel, setBatchLabel] = useState("cookunity-crops");

  useEffect(() => {
    return () => {
      cleanupProcessedImages(processedRef.current);
    };
  }, []);

  const latestImage = useMemo(() => processedImages[0] ?? null, [processedImages]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    await processFiles(files);
    event.target.value = "";
  }

  async function processFiles(files: File[]) {
    resetProcessedImages();
    setStatus(files.length === 1 ? "Analyzing image and preparing crop..." : `Analyzing ${files.length} images and preparing crops...`);
    setIsProcessing(true);

    const nextImages: ProcessedImage[] = [];

    try {
      for (const [index, file] of files.entries()) {
        const baseDescription = guessDescriptionFromText(stripExtension(file.name)) || `image ${index + 1}`;
        nextImages.push(
          await processImageSource({
            id: `file-${index}-${Date.now()}`,
            blob: file,
            mimeType: file.type,
            sourceLabel: file.name,
            suggestedDescription: baseDescription,
          }),
        );
      }

      commitProcessedImages(nextImages);
      setBatchLabel("uploaded-images");
      setStatus(nextImages.length === 1 ? "Crop ready." : `${nextImages.length} crops ready.`);
      setDetails(nextImages.length === 1 ? nextImages[0]?.details ?? "" : "Each file was processed to an exact 1200 x 600 export.");
    } catch (error) {
      cleanupProcessedImages(nextImages);
      setStatus("Unable to process the selected image files.");
      setDetails(error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handlePageUrlSubmit() {
    const normalizedUrl = pageUrl.trim();
    if (!normalizedUrl) {
      setStatus("Enter a blog post URL.");
      setDetails("The cropper will fetch the page and extract only images hosted on Amazon AWS or AirOps.");
      return;
    }

    resetProcessedImages();
    setStatus("Fetching the blog page and extracting supported images...");
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/cropper/discover?pageUrl=${encodeURIComponent(normalizedUrl)}`);
      const payload = (await response.json()) as Partial<DiscoveryResponse> & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to analyze that blog page.");
      }

      const images = payload.images ?? [];
      if (images.length === 0) {
        setStatus("No crop candidates found on that page.");
        setDetails("Only images hosted on Amazon AWS or AirOps are included. Logos and unrelated assets are filtered out.");
        setIsProcessing(false);
        return;
      }

      setBatchLabel(payload.pageTitle || normalizedUrl);
      await processCandidates(images, `${images.length} supported image${images.length === 1 ? "" : "s"} found on ${payload.pageTitle || normalizedUrl}.`);
    } catch (error) {
      setStatus("Unable to process images from that page URL.");
      setDetails(error instanceof Error ? error.message : "Unknown error.");
      setIsProcessing(false);
    }
  }

  async function handleMarkdownSubmit() {
    const candidates = extractImagesFromMarkdown(markdownInput);
    if (candidates.length === 0) {
      setStatus("No supported images found in the markdown.");
      setDetails("Only Amazon AWS and AirOps image hosts are included by default.");
      return;
    }

    resetProcessedImages();
    setBatchLabel("markdown-images");
    setStatus(`Fetching and cropping ${candidates.length} supported image${candidates.length === 1 ? "" : "s"} from pasted markdown...`);
    setIsProcessing(true);

    try {
      await processCandidates(candidates, "Descriptions were derived from alt text, captions, and image URLs when available.");
    } catch (error) {
      setStatus("Unable to process images from the pasted markdown.");
      setDetails(error instanceof Error ? error.message : "Unknown error.");
      setIsProcessing(false);
    }
  }

  async function processCandidates(candidates: MarkdownImageCandidate[], successDetails: string) {
    const nextImages: ProcessedImage[] = [];

    try {
      for (const candidate of candidates) {
        const response = await fetch(`/api/cropper/fetch?src=${encodeURIComponent(candidate.src)}`);
        if (!response.ok) {
          throw new Error(`Could not fetch ${candidate.src}`);
        }

        const blob = await response.blob();
        const mimeType = response.headers.get("content-type") ?? blob.type;
        nextImages.push(
          await processImageSource({
            id: candidate.id,
            blob,
            mimeType,
            sourceLabel: candidate.src,
            suggestedDescription: candidate.description,
          }),
        );
      }

      commitProcessedImages(nextImages);
      setStatus(nextImages.length === 1 ? "1 crop ready." : `${nextImages.length} crops ready.`);
      setDetails(successDetails);
    } catch (error) {
      cleanupProcessedImages(nextImages);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }

  async function processImageSource({
    id,
    blob,
    mimeType,
    sourceLabel,
    suggestedDescription,
  }: {
    id: string;
    blob: Blob;
    mimeType: string;
    sourceLabel: string;
    suggestedDescription: string;
  }) {
    const sourceUrl = URL.createObjectURL(blob);

    try {
      const image = await createImageBitmap(blob);
      try {
        const analysis = analyzeCrop(image.width, image.height, await buildSaliencyMap(image));
        const { blob: croppedBlob, extension } = await renderCrop(mimeType, image, analysis.crop);
        const croppedUrl = URL.createObjectURL(croppedBlob);
        const description = sanitizeDescription(suggestedDescription || "cookunity image");

        return {
          id,
          sourceLabel,
          sourceUrl,
          croppedUrl,
          description,
          fileName: buildDownloadName(description, extension),
          details: `${analysis.rationale} Source ${image.width} x ${image.height} cropped to ${OUTPUT_WIDTH} x ${OUTPUT_HEIGHT}.`,
        };
      } finally {
        image.close();
      }
    } catch (error) {
      URL.revokeObjectURL(sourceUrl);
      throw error;
    }
  }

  function commitProcessedImages(images: ProcessedImage[]) {
    processedRef.current = images;
    setProcessedImages(images);
  }

  function resetProcessedImages() {
    cleanupProcessedImages(processedRef.current);
    processedRef.current = [];
    setProcessedImages([]);
    setDetails("");
  }

  function updateDescription(id: string, nextDescription: string) {
    setProcessedImages((current) => {
      const updated = current.map((image) =>
        image.id === id
          ? {
              ...image,
              description: nextDescription,
              fileName: buildDownloadName(sanitizeDescription(nextDescription), extensionFromFileName(image.fileName)),
            }
          : image,
      );
      processedRef.current = updated;
      return updated;
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);

    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    if (files.length > 0) {
      void processFiles(files);
    }
  }

  async function handleDownloadAll() {
    if (processedImages.length === 0 || isZipping) {
      return;
    }

    setIsZipping(true);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const image of processedImages) {
        const response = await fetch(image.croppedUrl);
        const blob = await response.blob();
        zip.file(image.fileName, blob);
      }

      const archive = await zip.generateAsync({ type: "blob" });
      const archiveUrl = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = archiveUrl;
      link.download = `${slugifyDescription(batchLabel)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(archiveUrl);
    } catch (error) {
      setStatus("Unable to create the zip download.");
      setDetails(error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setIsZipping(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section
        style={{
          background: "linear-gradient(145deg, rgba(255,250,242,0.96), rgba(243,232,209,0.9))",
          border: "1px solid #d8c8aa",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 18px 40px rgba(45, 37, 18, 0.08)",
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#6c5b2f",
              }}
            >
              CookUnity Image Cropper
            </div>
            <h2 style={{ margin: "8px 0 10px", fontSize: 34, lineHeight: 1.05 }}>
              Blog URL first, markdown fallback, drag-and-drop always available
            </h2>
            <p style={{ margin: 0, maxWidth: 760, fontSize: 16, lineHeight: 1.6, color: "#473d25" }}>
              The tool crops to an exact 2:1 frame, defaults to center crop, shifts when balance demands it, and only
              auto-discovers blog images hosted on Amazon AWS or AirOps so logos and chrome stay out of the batch.
            </p>
          </div>

          <div style={inputPanelStyle}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Paste blog post URL</div>
              <div style={{ fontSize: 14, color: "#5a4d2c", marginTop: 4 }}>
                Recommended. The cropper fetches the page, resolves image URLs, and includes only `amazonaws.com` and `airops.com` hosts.
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input
                type="url"
                value={pageUrl}
                onChange={(event) => setPageUrl(event.target.value)}
                placeholder="https://blog.example.com/post-slug"
                style={{ ...textInputStyle, flex: "1 1 420px" }}
              />
              <button type="button" onClick={() => void handlePageUrlSubmit()} style={primaryButtonStyle} disabled={isProcessing}>
                Crop images from URL
              </button>
            </div>
          </div>

          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) {
                setIsDragActive(false);
              }
            }}
            onDrop={handleDrop}
            style={{
              borderRadius: 22,
              border: isDragActive ? "2px solid #203a2d" : "2px dashed #baa97f",
              background: isDragActive ? "rgba(32,58,45,0.08)" : "rgba(255,250,242,0.55)",
              padding: 24,
              display: "grid",
              gap: 14,
              justifyItems: "start",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 18 }}>Drop local image files here</div>
            <div style={{ color: "#5a4d2c", lineHeight: 1.5 }}>
              Upload one image, drag in multiple images, or use the fallback markdown mode below if you already have the article content.
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} style={primaryButtonStyle}>
                Select image files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                multiple
                onChange={handleFileChange}
                style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
              />
              <span style={{ fontSize: 14, color: "#5a4d2c" }}>{isProcessing ? "Processing..." : status}</span>
            </div>
            {details ? <div style={{ fontSize: 14, color: "#5a4d2c" }}>{details}</div> : null}
          </div>

          <div style={inputPanelStyle}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Paste blog markdown</div>
              <div style={{ fontSize: 14, color: "#5a4d2c", marginTop: 4 }}>
                Fallback mode. Paste the markdown for the post and the cropper will extract only `amazonaws.com` and `airops.com` image links.
              </div>
            </div>
            <textarea
              value={markdownInput}
              onChange={(event) => setMarkdownInput(event.target.value)}
              placeholder="![Alt text](https://bucket.amazonaws.com/path/image.jpg)"
              style={{
                minHeight: 180,
                width: "100%",
                resize: "vertical",
                borderRadius: 16,
                border: "1px solid #cdbd9e",
                padding: 14,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 13,
                background: "#fffdf8",
                color: "#2a261c",
              }}
            />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="button" onClick={() => void handleMarkdownSubmit()} style={primaryButtonStyle} disabled={isProcessing}>
                Crop images from markdown
              </button>
              <button type="button" onClick={() => setMarkdownInput("")} style={secondaryButtonStyle} disabled={isProcessing}>
                Clear markdown
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <PreviewCard
          title="Latest Source"
          subtitle={latestImage ? latestImage.sourceLabel : "Most recently processed image"}
          imageUrl={latestImage?.sourceUrl ?? null}
          emptyMessage="No image uploaded yet."
        />
        <PreviewCard
          title="Latest Cropped Output"
          subtitle="Exact export size: 1200 x 600"
          imageUrl={latestImage?.croppedUrl ?? null}
          emptyMessage="The processed crop will appear here."
        />
      </section>

      {processedImages.length > 0 ? (
        <section
          style={{
            background: "rgba(255,255,255,0.74)",
            border: "1px solid #e1d4bc",
            borderRadius: 22,
            padding: 18,
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
            display: "grid",
            gap: 16,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 20 }}>Processed images</h3>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#5f5b4f" }}>
              Edit the description if you want a more specific download filename.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void handleDownloadAll()} style={primaryButtonStyle} disabled={isZipping}>
              {isZipping ? "Creating zip..." : `Download all as zip (${processedImages.length})`}
            </button>
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {processedImages.map((image) => (
              <article
                key={image.id}
                style={{
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns: "minmax(0, 240px) minmax(0, 1fr)",
                  alignItems: "start",
                  borderTop: "1px solid #efe4d0",
                  paddingTop: 16,
                }}
              >
                <div
                  style={{
                    aspectRatio: "2 / 1",
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px solid #d9ccb3",
                    background: "#f7f0e4",
                  }}
                >
                  <img
                    src={image.croppedUrl}
                    alt={image.description}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 13, color: "#6a604c" }}>{image.sourceLabel}</div>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Description-based filename</span>
                    <input
                      value={image.description}
                      onChange={(event) => updateDescription(image.id, event.target.value)}
                      style={textInputStyle}
                    />
                  </label>
                  <div style={{ fontSize: 14, color: "#5a4d2c" }}>{image.details}</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a href={image.croppedUrl} download={image.fileName} style={primaryLinkStyle}>
                      Download {image.fileName}
                    </a>
                    <a href={image.sourceUrl} target="_blank" rel="noreferrer" style={secondaryLinkStyle}>
                      View source
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PreviewCard({
  title,
  subtitle,
  imageUrl,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  emptyMessage: string;
}) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.74)",
        border: "1px solid #e1d4bc",
        borderRadius: 22,
        padding: 18,
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#5f5b4f" }}>{subtitle}</p>
      </div>
      <div
        style={{
          aspectRatio: "2 / 1",
          borderRadius: 18,
          overflow: "hidden",
          background:
            "radial-gradient(circle at top, rgba(240, 221, 189, 0.8), rgba(226, 212, 183, 0.4) 40%, rgba(239, 234, 223, 0.9))",
          border: "1px dashed #c9bb9f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <span style={{ padding: 24, textAlign: "center", color: "#6d634e" }}>{emptyMessage}</span>
        )}
      </div>
    </section>
  );
}

async function buildSaliencyMap(image: ImageBitmap) {
  const scale = Math.min(1, MAX_ANALYSIS_EDGE / Math.max(image.width, image.height));
  const width = Math.max(2, Math.round(image.width * scale));
  const height = Math.max(2, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Canvas rendering is unavailable in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const luminance = new Float32Array(width * height);
  const saliency = new Float32Array(width * height);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;
    luminance[index] = red * 0.299 + green * 0.587 + blue * 0.114;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const center = luminance[index] ?? 0;
      const left = luminance[y * width + Math.max(0, x - 1)] ?? center;
      const right = luminance[y * width + Math.min(width - 1, x + 1)] ?? center;
      const top = luminance[Math.max(0, y - 1) * width + x] ?? center;
      const bottom = luminance[Math.min(height - 1, y + 1) * width + x] ?? center;
      const edge = Math.abs(right - left) + Math.abs(bottom - top);
      const localContrast =
        Math.abs(center - left) +
        Math.abs(center - right) +
        Math.abs(center - top) +
        Math.abs(center - bottom);
      saliency[index] = edge * 0.7 + localContrast * 0.3 + 1;
    }
  }

  return { width, height, saliency };
}

function analyzeCrop(imageWidth: number, imageHeight: number, analysis: { width: number; height: number; saliency: Float32Array }): AnalysisResult {
  const sourceAspect = imageWidth / imageHeight;
  const cropWidth = sourceAspect >= TARGET_ASPECT ? imageHeight * TARGET_ASPECT : imageWidth;
  const cropHeight = sourceAspect >= TARGET_ASPECT ? imageHeight : imageWidth / TARGET_ASPECT;
  const centerCrop: CropRect = {
    x: (imageWidth - cropWidth) / 2,
    y: (imageHeight - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  };

  const movementAxis = sourceAspect >= TARGET_ASPECT ? "x" : "y";
  const maxOffset = movementAxis === "x" ? imageWidth - cropWidth : imageHeight - cropHeight;

  if (maxOffset <= 2) {
    return {
      crop: clampCrop(centerCrop, imageWidth, imageHeight),
      rationale: "Centered crop retained because the source already fits the 2:1 frame closely.",
    };
  }

  const centerScore = scoreCrop(centerCrop, analysis, imageWidth, imageHeight);
  let bestCrop = centerCrop;
  let bestScore = centerScore;
  const steps = 24;

  for (let step = 0; step <= steps; step += 1) {
    const offset = (maxOffset * step) / steps;
    const candidate: CropRect =
      movementAxis === "x"
        ? { x: offset, y: 0, width: cropWidth, height: cropHeight }
        : { x: 0, y: offset, width: cropWidth, height: cropHeight };
    const score = scoreCrop(candidate, analysis, imageWidth, imageHeight);
    if (score > bestScore) {
      bestScore = score;
      bestCrop = candidate;
    }
  }

  const centerOffset = movementAxis === "x" ? centerCrop.x : centerCrop.y;
  const bestOffset = movementAxis === "x" ? bestCrop.x : bestCrop.y;
  const shiftRatio = Math.abs(bestOffset - centerOffset) / maxOffset;

  if (bestScore - centerScore < 0.015 || shiftRatio < 0.06) {
    return {
      crop: clampCrop(centerCrop, imageWidth, imageHeight),
      rationale: "Centered crop retained because the composition remains balanced within the 2:1 frame.",
    };
  }

  const direction = movementAxis === "x" ? (bestOffset > centerOffset ? "right" : "left") : bestOffset > centerOffset ? "down" : "up";
  const shiftPercent = Math.round(shiftRatio * 100);

  return {
    crop: clampCrop(bestCrop, imageWidth, imageHeight),
    rationale: `Crop shifted ${shiftPercent}% ${direction} to keep the visual weight more balanced than a strict center crop.`,
  };
}

function scoreCrop(
  crop: CropRect,
  analysis: { width: number; height: number; saliency: Float32Array },
  imageWidth: number,
  imageHeight: number,
) {
  const startX = Math.max(0, Math.floor((crop.x / imageWidth) * analysis.width));
  const endX = Math.min(analysis.width, Math.ceil(((crop.x + crop.width) / imageWidth) * analysis.width));
  const startY = Math.max(0, Math.floor((crop.y / imageHeight) * analysis.height));
  const endY = Math.min(analysis.height, Math.ceil(((crop.y + crop.height) / imageHeight) * analysis.height));

  let total = 0;
  let left = 0;
  let right = 0;
  let top = 0;
  let bottom = 0;
  let edgePressure = 0;
  const halfX = (startX + endX) / 2;
  const halfY = (startY + endY) / 2;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const value = analysis.saliency[y * analysis.width + x] ?? 0;
      total += value;
      if (x < halfX) {
        left += value;
      } else {
        right += value;
      }
      if (y < halfY) {
        top += value;
      } else {
        bottom += value;
      }

      const nearVerticalEdge = x - startX < 2 || endX - x <= 2;
      const nearHorizontalEdge = y - startY < 2 || endY - y <= 2;
      if (nearVerticalEdge || nearHorizontalEdge) {
        edgePressure += value;
      }
    }
  }

  const imageCenterX = imageWidth / 2;
  const imageCenterY = imageHeight / 2;
  const cropCenterX = crop.x + crop.width / 2;
  const cropCenterY = crop.y + crop.height / 2;
  const centerPenalty =
    Math.abs(cropCenterX - imageCenterX) / imageWidth + Math.abs(cropCenterY - imageCenterY) / imageHeight;
  const horizontalBalance = total > 0 ? 1 - Math.abs(left - right) / total : 0;
  const verticalBalance = total > 0 ? 1 - Math.abs(top - bottom) / total : 0;
  const edgePenalty = total > 0 ? edgePressure / total : 0;

  return total * 0.0012 + horizontalBalance * 0.28 + verticalBalance * 0.2 - centerPenalty * 0.45 - edgePenalty * 0.18;
}

async function renderCrop(sourceType: string, image: ImageBitmap, crop: CropRect) {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is unavailable in this browser.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const outputType = normalizeOutputType(sourceType);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, 0.92);
  });

  if (!blob) {
    throw new Error("The browser could not export the cropped image.");
  }

  return { blob, extension: extensionForMimeType(outputType) };
}

function normalizeOutputType(type: string) {
  if (type === "image/png" || type === "image/webp" || type === "image/jpeg") {
    return type;
  }

  return "image/jpeg";
}

function buildDownloadName(description: string, extension: string) {
  const safeBase = slugifyDescription(description);
  return `${safeBase}-1200x600.${extension}`;
}

function sanitizeDescription(description: string) {
  const cleaned = description.trim().replace(/\s+/g, " ").slice(0, 96).trim();
  return cleaned || "cookunity image";
}

function slugifyDescription(description: string) {
  const slug = sanitizeDescription(description)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "cookunity-image";
}

function stripExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

function clampCrop(crop: CropRect, imageWidth: number, imageHeight: number): CropRect {
  return {
    x: Math.min(Math.max(0, crop.x), imageWidth - crop.width),
    y: Math.min(Math.max(0, crop.y), imageHeight - crop.height),
    width: crop.width,
    height: crop.height,
  };
}

function extensionForMimeType(type: string) {
  if (type === "image/png") {
    return "png";
  }
  if (type === "image/webp") {
    return "webp";
  }
  return "jpg";
}

function extensionFromFileName(fileName: string) {
  const parts = fileName.split(".");
  return parts[parts.length - 1] || "jpg";
}

function cleanupProcessedImages(images: ProcessedImage[]) {
  for (const image of images) {
    URL.revokeObjectURL(image.sourceUrl);
    URL.revokeObjectURL(image.croppedUrl);
  }
}

function extractImagesFromMarkdown(markdown: string): MarkdownImageCandidate[] {
  if (!markdown.trim()) {
    return [];
  }

  const candidates: MarkdownImageCandidate[] = [];
  const seen = new Set<string>();
  const imagePattern = /!\[([^\]]*)\]\((\S+?)(?:\s+["'][^"']*["'])?\)/g;
  let match: RegExpExecArray | null = imagePattern.exec(markdown);

  while (match) {
    const altText = match[1] ?? "";
    const rawUrl = (match[2] ?? "").replace(/^<|>$/g, "");
    if (rawUrl && isSupportedImageHost(rawUrl) && !seen.has(rawUrl)) {
      seen.add(rawUrl);
      candidates.push({
        id: `markdown-${candidates.length}-${Date.now()}`,
        src: rawUrl,
        description: sanitizeDescription(
          altText || guessDescriptionFromText(lastPathSegment(rawUrl)) || `blog image ${candidates.length + 1}`,
        ),
      });
    }
    match = imagePattern.exec(markdown);
  }

  const bareUrlPattern = /https?:\/\/[^\s)>"']+/g;
  const bareUrls = markdown.match(bareUrlPattern) ?? [];

  for (const url of bareUrls) {
    if (!isSupportedImageHost(url) || seen.has(url)) {
      continue;
    }
    seen.add(url);
    candidates.push({
      id: `markdown-${candidates.length}-${Date.now()}`,
      src: url,
      description: sanitizeDescription(
        guessDescriptionFromText(lastPathSegment(url)) || `blog image ${candidates.length + 1}`,
      ),
    });
  }

  return candidates;
}

function isSupportedImageHost(src: string) {
  try {
    const url = new URL(src);
    return url.hostname.includes("amazonaws.com") || url.hostname.includes("airops.com");
  } catch {
    return false;
  }
}

function lastPathSegment(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] ?? "");
  } catch {
    return url;
  }
}

function guessDescriptionFromText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(img|image|photo|hero|banner|cookunity)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const inputPanelStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  background: "rgba(255,255,255,0.6)",
  border: "1px solid #e1d4bc",
  borderRadius: 20,
  padding: 18,
};

const textInputStyle: CSSProperties = {
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid #cdbd9e",
  padding: "0 12px",
  fontSize: 14,
  background: "#fffdf8",
  color: "#2a261c",
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 999,
  background: "#203a2d",
  color: "#fffaf2",
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 999,
  background: "#fffaf2",
  color: "#203a2d",
  fontWeight: 800,
  border: "1px solid #203a2d",
  cursor: "pointer",
};

const primaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 999,
  background: "#203a2d",
  color: "#fffaf2",
  fontWeight: 800,
  textDecoration: "none",
};

const secondaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 999,
  background: "#fffaf2",
  color: "#203a2d",
  fontWeight: 800,
  textDecoration: "none",
  border: "1px solid #203a2d",
};
