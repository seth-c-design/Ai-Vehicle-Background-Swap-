import React, { useRef, useState, useEffect } from 'react';
import type { PinPosition } from '../types';
import PinIcon from './icons/PinIcon';

interface ImageDisplayProps {
  src: string;
  alt: string;
  pinPosition?: PinPosition | null;
  onSetPin?: (pos: PinPosition) => void;
  title: string;
  isInteractive: boolean;
  overlayDimensions?: { width: number; height: number };
  showOverlay?: boolean;
  onDimensionsChange?: (dims: { width: number, height: number }) => void;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ 
  src, 
  alt, 
  pinPosition, 
  onSetPin, 
  title, 
  isInteractive,
  overlayDimensions,
  showOverlay,
  onDimensionsChange
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const imgElement = imgRef.current;
    if (!imgElement) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setImgDims({ width, height });
        if (onDimensionsChange) {
            onDimensionsChange({ width, height });
        }
      }
    });

    const handleLoad = () => {
      const dims = { width: imgElement.offsetWidth, height: imgElement.offsetHeight };
      setImgDims(dims);
      if (onDimensionsChange) {
        onDimensionsChange(dims);
      }
      observer.observe(imgElement);
    };

    if (imgElement.complete) {
      handleLoad();
    } else {
      imgElement.addEventListener('load', handleLoad, { once: true });
    }

    return () => {
      imgElement.removeEventListener('load', handleLoad);
      observer.disconnect();
    };
  }, [src, onDimensionsChange]);
  
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!onSetPin || !isInteractive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const pinX = Math.round(x);
    const pinY = Math.round(y);

    onSetPin({ x: pinX, y: pinY });
  };

  let overlayStyle: React.CSSProperties = { display: 'none' };
  if (showOverlay && pinPosition && overlayDimensions && imgDims.width > 0 && isInteractive) {
    const aspectRatio = overlayDimensions.width / overlayDimensions.height;
    const baseWidth = imgDims.width * 0.25; // Represents a mid-range vehicle size
    const baseHeight = baseWidth / aspectRatio;

    const minScale = 0.2;
    const maxScale = 1.2;
    const relativeY = pinPosition.y / imgDims.height;
    const scale = minScale + (maxScale - minScale) * Math.min(Math.max(relativeY, 0), 1);

    const maxRotation = 75; // degrees, for items far away (top of screen)
    const minRotation = 20; // degrees, for items close up (bottom of screen)
    const rotation = maxRotation - (maxRotation - minRotation) * relativeY;

    overlayStyle = {
      position: 'absolute',
      left: `${pinPosition.x}px`,
      top: `${pinPosition.y}px`,
      width: `${baseWidth}px`,
      height: `${baseHeight}px`,
      background: 'radial-gradient(ellipse at center, rgba(255, 0, 0, 0.5) 0%, rgba(255, 0, 0, 0) 70%)',
      borderRadius: '50%',
      pointerEvents: 'none',
      transform: `translate(-50%, -50%) rotateX(${rotation}deg) scale(${scale})`,
      transformStyle: 'preserve-3d',
    };
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-2 text-center">{title}</h3>
      <div 
        className={`relative w-full h-full flex-grow ${isInteractive ? 'cursor-crosshair' : ''}`}
        style={{ perspective: '1000px' }}
      >
        <img 
          ref={imgRef}
          src={src} 
          alt={alt} 
          className="w-full h-full object-contain rounded-md"
          onClick={handleImageClick}
        />
        {showOverlay && <div style={overlayStyle} />}
        {pinPosition && (
          <div 
            className="absolute transform -translate-x-1/2 -translate-y-full" 
            style={{ left: `${pinPosition.x}px`, top: `${pinPosition.y}px`, pointerEvents: 'none' }}
          >
            <PinIcon className="w-8 h-8 text-red-500 drop-shadow-lg" fill="red" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageDisplay;