/**
 * Utility for client-side webcam handling and compact facial feature extraction.
 * No raw photos or video streams are ever stored in localStorage or sent to the server.
 * Only a normalized 64-dimensional numerical feature vector is extracted and transmitted.
 */

export interface CameraStreamResult {
  stream: MediaStream | null;
  error: string | null;
}

export interface FaceDescriptorResult {
  descriptor: number[] | null;
  error: string | null;
}

export async function startWebcam(): Promise<CameraStreamResult> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      stream: null,
      error: "Camera access is not supported by your browser or requires a secure HTTPS/localhost connection.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });
    return { stream, error: null };
  } catch (err: any) {
    let message = "Unable to access camera.";
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      message = "Camera permission was denied. Please allow camera permissions in your browser address bar.";
    } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      message = "No camera device was detected on your system.";
    } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      message = "Camera is currently in use by another application.";
    }
    return { stream: null, error: message };
  }
}

export function stopWebcam(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Extracts a normalized 64-dimensional facial luminance & gradient distribution vector
 * from the active webcam video element.
 */
export function extractFaceDescriptor(videoEl: HTMLVideoElement): FaceDescriptorResult {
  if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
    return { descriptor: null, error: "Webcam video feed is not active or still initializing." };
  }

  try {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return { descriptor: null, error: "Canvas 2D context unavailable." };
    }

    // Crop center square from video to focus squarely on the face
    const minDim = Math.min(videoEl.videoWidth, videoEl.videoHeight);
    const sx = (videoEl.videoWidth - minDim) / 2;
    const sy = (videoEl.videoHeight - minDim) / 2;

    ctx.drawImage(videoEl, sx, sy, minDim, minDim, 0, 0, size, size);
    const imgData = ctx.getImageData(0, 0, size, size);
    const pixels = imgData.data;

    // Check overall lighting to ensure a clear capture
    let totalLuminance = 0;
    const totalPixels = size * size;
    for (let i = 0; i < pixels.length; i += 4) {
      const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      totalLuminance += lum;
    }
    const avgLum = totalLuminance / totalPixels;

    if (avgLum < 20) {
      return { descriptor: null, error: "Lighting is too dark. Please ensure your face is well-lit." };
    }
    if (avgLum > 240) {
      return { descriptor: null, error: "Lighting is overexposed. Please face away from direct harsh glare." };
    }

    // Partition into an 8x8 grid (64 sub-regions of 16x16 pixels)
    const gridSize = 8;
    const cellSize = size / gridSize;
    const rawVector: number[] = new Array(64).fill(0);

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let cellSum = 0;
        let cellGradientSum = 0;
        const cellStartX = gx * cellSize;
        const cellStartY = gy * cellSize;

        for (let y = 0; y < cellSize; y++) {
          for (let x = 0; x < cellSize; x++) {
            const px = cellStartX + x;
            const py = cellStartY + y;
            const idx = (py * size + px) * 4;
            const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
            cellSum += lum;

            // Local horizontal and vertical gradient
            if (x > 0 && y > 0) {
              const leftIdx = (py * size + (px - 1)) * 4;
              const topIdx = ((py - 1) * size + px) * 4;
              const leftLum = 0.299 * pixels[leftIdx] + 0.587 * pixels[leftIdx + 1] + 0.114 * pixels[leftIdx + 2];
              const topLum = 0.299 * pixels[topIdx] + 0.587 * pixels[topIdx + 1] + 0.114 * pixels[topIdx + 2];
              cellGradientSum += Math.abs(lum - leftLum) + Math.abs(lum - topLum);
            }
          }
        }

        const cellIndex = gy * gridSize + gx;
        const cellPixelCount = cellSize * cellSize;
        const avgCellLum = cellSum / cellPixelCount;
        const avgCellGrad = cellGradientSum / cellPixelCount;

        // Weight central cells (where eyes, nose, mouth are located in oval guide)
        const distFromCenter = Math.hypot(gx - 3.5, gy - 3.5);
        const centerWeight = Math.max(0.5, 1.4 - distFromCenter * 0.18);

        rawVector[cellIndex] = (avgCellLum * 0.65 + avgCellGrad * 2.5) * centerWeight;
      }
    }

    // L2 Normalization to unit length so Euclidean distance is directly comparable
    let sumSq = 0;
    for (let i = 0; i < rawVector.length; i++) {
      sumSq += rawVector[i] * rawVector[i];
    }
    const norm = Math.sqrt(sumSq) || 1;
    const normalizedDescriptor = rawVector.map((val) => Number((val / norm).toFixed(6)));

    return { descriptor: normalizedDescriptor, error: null };
  } catch (err: any) {
    return { descriptor: null, error: err.message || "Failed to extract biometric face descriptor." };
  }
}
