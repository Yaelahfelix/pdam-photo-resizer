"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function ImageProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [lengthFile, setLengthFile] = useState(0);
  const [compressFolder, setCompressFolder] = useState<JSZip>();

  const processImage = async (
    file: File,
    width: number,
    height: number
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas context not found");

        const scale = Math.max(width / img.width, height / img.height);
        const newWidth = img.width * scale;
        const newHeight = img.height * scale;

        ctx.drawImage(
          img,
          (width - newWidth) / 2,
          (height - newHeight) / 2,
          newWidth,
          newHeight
        );

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject("Blob creation failed");
            resolve(blob);
          },
          "image/jpeg",
          0.8
        );
      };
      img.onerror = () => reject("Image loading failed");
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setIsDone(false);
    setLengthFile(acceptedFiles.length);
    setIsProcessing(true);
    const zip = new JSZip();
    const totalFiles = acceptedFiles.length;
    let processed = 0;

    try {
      for (const file of acceptedFiles) {
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        console.log(baseName);
        let fileName;
        const standardName = baseName.split("_")[0];
        if (standardName) {
          fileName = standardName;
        } else {
          fileName = baseName;
        }
        const folder = zip.folder(fileName);
        console.log(folder);
        if (!folder) continue;

        try {
          const [thumbnail, medium] = await Promise.all([
            processImage(file, 480, 320),
            processImage(file, 640, 480),
          ]);

          folder.file(`${fileName}_thumbnail.jpg`, thumbnail);
          folder.file(`${fileName}.jpg`, medium);

          processed++;
          setProgress(Math.round((processed / totalFiles) * 100));
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
        }
      }

      setIsDone(true);
      setCompressFolder(zip);
    } catch (error) {
      console.error("Gagal membuat zip:", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  const downloadHandler = async () => {
    const now = new Date();
    const formattedDate = format(now, "dd-MMMM-yyyy-HH:mm:ss", { locale: id });
    const content = await compressFolder!.generateAsync({ type: "blob" });
    saveAs(content, `compress_${formattedDate}.zip`);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true,
    disabled: isProcessing,
  });

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-100 to-gray-300 py-8 px-4 grid place-content-center w-full">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          PDAM ULTIMATE PHOTO RESIZER
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-3">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-500"
              }
              ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <svg
                className={`mx-auto h-12 w-12 mb-4 ${
                  isDragActive ? "text-blue-500" : "text-gray-400"
                }`}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="space-y-2">
                <p className="text-gray-600">
                  {isProcessing ? (
                    "Memproses..."
                  ) : isDragActive ? (
                    <span className="text-blue-500">Drop images here</span>
                  ) : (
                    <>
                      Drag & drop images here, or{" "}
                      <span className="text-blue-500">click to select</span>
                    </>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  Supports: JPEG, PNG, WEBP (Direkomendasikan tidak lebih dari
                  2000 file)
                </p>
              </div>
            </div>
          </div>

          {isProcessing && (
            <div className="mt-6">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">
                Loading {progress}%
              </p>
            </div>
          )}
        </div>
        {isDone && (
          <div className="w-full bg-green-300 text-green-800 font-bold rounded-lg px-10 py-5 mb-5">
            Berhasil mengkompress {lengthFile} Foto
          </div>
        )}
        <button
          disabled={!isDone}
          onClick={downloadHandler}
          className="bg-blue-700 hover:bg-blue-800 transition-colors text-white w-full py-3 rounded-lg shadow disabled:bg-blue-400"
        >
          Download Semua File
        </button>
      </div>
    </div>
  );
}
