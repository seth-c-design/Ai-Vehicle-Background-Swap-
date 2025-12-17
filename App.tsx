import React, { useState, useRef, useCallback } from 'react';
import type { FileInfo, PinPosition } from './types';
import { extractVehicle, blendVehicleIntoScene } from './services/geminiService';
import ImageUploader from './components/ImageUploader';

interface ExtractedVehicle {
    src: string;
    width: number;
    height: number;
}

const App: React.FC = () => {
    const [subjectVehicle, setSubjectVehicle] = useState<FileInfo | null>(null);
    const [backgroundScene, setBackgroundScene] = useState<FileInfo | null>(null);
    const [isExtracting, setIsExtracting] = useState<boolean>(false);
    const [extractedVehicle, setExtractedVehicle] = useState<ExtractedVehicle | null>(null);
    const [vehiclePosition, setVehiclePosition] = useState<PinPosition | null>(null);
    const [vehicleScale, setVehicleScale] = useState<number>(1);
    
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    const backgroundContainerRef = useRef<HTMLDivElement>(null);
    const backgroundImageRef = useRef<HTMLImageElement>(null);

    const handleSubjectUpload = async (fileInfo: FileInfo) => {
        setSubjectVehicle(fileInfo);
        setExtractedVehicle(null);
        setGeneratedImage(null);
        setError(null);
        setIsExtracting(true);
        try {
            const resultSrc = await extractVehicle(fileInfo);
            
            const img = new Image();
            img.onload = () => {
                setExtractedVehicle({
                    src: resultSrc,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                });

                const bgImage = backgroundImageRef.current;
                const container = backgroundContainerRef.current;
                const backgroundRenderWidth = bgImage?.offsetWidth || container?.offsetWidth || 512;
                const baseScale = (backgroundRenderWidth / 4) / img.naturalWidth;
                setVehicleScale(baseScale);
            }
            img.src = resultSrc;

        } catch (e: any) {
            console.error(e);
            setError(`Failed to extract vehicle: ${e.message}`);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleBackgroundUpload = (fileInfo: FileInfo) => {
        setBackgroundScene(fileInfo);
        setVehiclePosition(null); // Reset position on new background
        setGeneratedImage(null);
        setError(null);
    };
    
    const handleVehicleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const vehicleId = e.dataTransfer.getData('application/vehicle-id');
        if (!backgroundContainerRef.current || vehicleId !== 'extracted-vehicle') return;

        const rect = backgroundContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setVehiclePosition({ x, y });
    }, []);

    const handleGenerate = async () => {
        if (!extractedVehicle?.src || !backgroundScene || !vehiclePosition) {
            setError("Please upload both images and place the vehicle on the scene.");
            return;
        }

        setError(null);
        setIsLoading(true);
        setGeneratedImage(null);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not create canvas context.");

            const bgImg = new Image();
            bgImg.src = backgroundScene.base64;

            const vehicleImg = new Image();
            vehicleImg.src = extractedVehicle.src;
            
            await Promise.all([
                new Promise(resolve => bgImg.onload = resolve),
                new Promise(resolve => vehicleImg.onload = resolve)
            ]);
            
            canvas.width = bgImg.naturalWidth;
            canvas.height = bgImg.naturalHeight;

            // Draw background
            ctx.drawImage(bgImg, 0, 0);

            // Calculate vehicle position on the original image dimensions
            const renderedBg = backgroundImageRef.current!;
            const { naturalWidth: originalWidth, naturalHeight: originalHeight } = bgImg;
            const { offsetWidth: renderedWidth, offsetHeight: renderedHeight } = renderedBg;

            const originalAspectRatio = originalWidth / originalHeight;
            const containerAspectRatio = renderedWidth / renderedHeight;

            let actualRenderedWidth, actualRenderedHeight;
            if (originalAspectRatio > containerAspectRatio) {
                actualRenderedWidth = renderedWidth;
                actualRenderedHeight = renderedWidth / originalAspectRatio;
            } else {
                actualRenderedHeight = renderedHeight;
                actualRenderedWidth = renderedHeight * originalAspectRatio;
            }

            const paddingX = (renderedWidth - actualRenderedWidth) / 2;
            const paddingY = (renderedHeight - actualRenderedHeight) / 2;

            const pinXOnImage = vehiclePosition.x - paddingX;
            const pinYOnImage = vehiclePosition.y - paddingY;

            const relativeX = pinXOnImage / actualRenderedWidth;
            const relativeY = pinYOnImage / actualRenderedHeight;
            
            const finalX = relativeX * originalWidth;
            const finalY = relativeY * originalHeight;

            const vehicleDrawWidth = vehicleImg.naturalWidth * vehicleScale;
            const vehicleDrawHeight = vehicleImg.naturalHeight * vehicleScale;
            
            // Draw vehicle
            ctx.drawImage(
                vehicleImg,
                finalX - vehicleDrawWidth / 2,
                finalY - vehicleDrawHeight / 2,
                vehicleDrawWidth,
                vehicleDrawHeight
            );

            const compositeBase64 = canvas.toDataURL('image/png');
            const compositeFileInfo: FileInfo = {
                name: 'composite.png',
                type: 'image/png',
                size: 0,
                base64: compositeBase64,
                width: canvas.width,
                height: canvas.height,
            };

            const result = await blendVehicleIntoScene(compositeFileInfo);
            setGeneratedImage(result);

        } catch (e: any) {
            console.error(e);
            setError(`An error occurred during generation: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const isGenerateDisabled = !extractedVehicle?.src || !backgroundScene || !vehiclePosition || isLoading;

    const renderContent = () => {
        if (!subjectVehicle || !backgroundScene) {
            return (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="min-h-[250px] md:min-h-[350px]">
                       {subjectVehicle ? (
                             <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col items-center justify-center relative">
                                {isExtracting && (
                                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-20 rounded-lg">
                                        <svg className="animate-spin h-8 w-8 text-white mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <p className="text-lg font-semibold">Extracting Vehicle...</p>
                                    </div>
                                )}
                                <img src={extractedVehicle ? extractedVehicle.src : subjectVehicle.base64} alt={subjectVehicle.name} className="max-w-full max-h-48 object-contain rounded-md mb-4" />
                                <h3 className="text-lg font-semibold text-white">{extractedVehicle ? "Extracted Vehicle" : "Subject Vehicle"}</h3>
                                <p className="text-sm text-gray-400">{subjectVehicle.name}</p>
                            </div>
                        ) : (
                             <ImageUploader
                                onImageUpload={handleSubjectUpload}
                                title="1. Upload Subject Vehicle"
                                description="Drag & drop or click to upload"
                            />
                        )}
                    </div>
                    <div className="min-h-[250px] md:min-h-[350px]">
                        {backgroundScene ? (
                             <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col items-center justify-center">
                                <img src={backgroundScene.base64} alt={backgroundScene.name} className="max-w-full max-h-48 object-contain rounded-md mb-4" />
                                <h3 className="text-lg font-semibold text-white">Background Scene</h3>
                                <p className="text-sm text-gray-400">{backgroundScene.name}</p>
                             </div>
                        ) : (
                            <ImageUploader
                                onImageUpload={handleBackgroundUpload}
                                title="2. Upload Background Scene"
                                description="Drag & drop or click to upload"
                            />
                        )}
                    </div>
                </div>
            );
        }

        // Composition View
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-4 order-2 lg:order-1">
                        <div 
                            ref={backgroundContainerRef}
                            className="relative w-full mx-auto bg-gray-800 rounded-lg overflow-hidden shadow-2xl"
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={handleVehicleDrop}
                        >
                            <img
                                ref={backgroundImageRef}
                                src={backgroundScene.base64}
                                alt="Background Scene"
                                className="w-full h-auto object-contain"
                            />
                            {extractedVehicle && vehiclePosition && (
                                <img
                                    src={extractedVehicle.src}
                                    alt="Extracted Vehicle"
                                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl"
                                    style={{
                                        left: `${vehiclePosition.x}px`,
                                        top: `${vehiclePosition.y}px`,
                                        transform: `translate(-50%, -50%) scale(${vehicleScale})`,
                                        width: `${extractedVehicle.width}px`
                                    }}
                                />
                            )}
                            {!vehiclePosition && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none rounded-lg">
                                    <p className="text-white text-2xl font-bold text-center drop-shadow-lg p-4">
                                        Drag the vehicle from the panel and drop it here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-1 bg-gray-800 rounded-lg p-4 shadow-lg flex flex-col items-center space-y-4 order-1 lg:order-2">
                        <h3 className="text-xl font-bold text-white text-center">Your Vehicle</h3>
                        {extractedVehicle ? (
                            <>
                                <div className="p-2 bg-grid-pattern rounded-md border border-gray-600">
                                    <img
                                        src={extractedVehicle.src}
                                        alt="Extracted Vehicle"
                                        className="max-w-full h-auto cursor-grab active:cursor-grabbing"
                                        draggable="true"
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('application/vehicle-id', 'extracted-vehicle');
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                    />
                                </div>
                                 <p className="text-sm text-gray-400 text-center">Drag the vehicle onto the scene to place it.</p>
                                <div className="w-full pt-4">
                                    <label htmlFor="vehicle-scale" className="block text-md font-semibold text-gray-300 mb-2 text-center">
                                        Adjust Vehicle Size
                                    </label>
                                    <input
                                        id="vehicle-scale"
                                        type="range"
                                        min="0.1"
                                        max="3"
                                        step="0.05"
                                        value={vehicleScale}
                                        onChange={(e) => setVehicleScale(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                        AI Vehicle Background Swap
                    </h1>
                    <p className="mt-2 text-lg text-gray-400 max-w-3xl mx-auto">
                        Upload a vehicle and background. Place and resize the vehicle. Then let AI blend the scene perfectly.
                    </p>
                </header>

                <main>
                    {renderContent()}
                    
                    <div className="text-center my-8">
                         <button
                            onClick={handleGenerate}
                            disabled={isGenerateDisabled}
                            className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors duration-200"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Blending Scene...
                                </>
                            ) : (
                                "Generate Image"
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative text-center max-w-3xl mx-auto" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {generatedImage && (
                        <div className="mt-8">
                             <h2 className="text-3xl font-bold text-center mb-4">Generated Result</h2>
                            <div className="bg-gray-800 p-4 rounded-lg shadow-2xl max-w-5xl mx-auto">
                                <img src={generatedImage} alt="Generated vehicle in background" className="w-full h-auto object-contain rounded-md" />
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;