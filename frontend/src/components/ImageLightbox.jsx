import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ImageLightbox.css';

const ImageLightbox = ({
  src,
  fallbackSrc,
  alt,
  className,
  loading,
  openLabel,
  closeLabel,
  zoomInLabel,
  zoomOutLabel,
  resetZoomLabel,
  zoomControlsLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const triggerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    setImageSrc(src);
    setZoom({ scale: 1, x: 0, y: 0 });
  }, [src]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  const handleImageError = () => {
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
  };

  const setScale = (nextScale, pointer) => {
    const scale = Math.min(5, Math.max(1, nextScale));

    if (scale === 1) {
      setZoom({ scale: 1, x: 0, y: 0 });
      return;
    }

    const rect = imageRef.current?.getBoundingClientRect();
    const ratio = scale / zoom.scale;
    const pointerX = pointer ? pointer.x - (rect.left + rect.width / 2) : 0;
    const pointerY = pointer ? pointer.y - (rect.top + rect.height / 2) : 0;

    setZoom({
      scale,
      x: zoom.x + pointerX * (1 - ratio),
      y: zoom.y + pointerY * (1 - ratio),
    });
  };

  const handleWheel = (event) => {
    event.preventDefault();
    setScale(zoom.scale * (event.deltaY < 0 ? 1.2 : 1 / 1.2), {
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handlePointerDown = (event) => {
    if (zoom.scale === 1 || event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      zoomX: zoom.x,
      zoomY: zoom.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;

    setZoom((current) => ({
      ...current,
      x: dragRef.current.zoomX + event.clientX - dragRef.current.x,
      y: dragRef.current.zoomY + event.clientY - dragRef.current.y,
    }));
  };

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="image-lightbox__trigger"
        aria-label={`${openLabel}: ${alt}`}
        title={openLabel}
        onClick={() => {
          setZoom({ scale: 1, x: 0, y: 0 });
          setIsOpen(true);
        }}
      >
        <img className={className} src={imageSrc} alt={alt} loading={loading} onError={handleImageError} />
        <span className="image-lightbox__expand-hint" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
          </svg>
        </span>
      </button>
      {isOpen && createPortal(
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={alt || openLabel}
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Tab') {
              const focusableButtons = event.currentTarget.querySelectorAll('button');
              const firstButton = focusableButtons[0];
              const lastButton = focusableButtons[focusableButtons.length - 1];

              if (!event.shiftKey && document.activeElement === lastButton) {
                event.preventDefault();
                firstButton.focus();
                return;
              }
              if (event.shiftKey && document.activeElement === firstButton) {
                event.preventDefault();
                lastButton.focus();
                return;
              }

              if (focusableButtons.length > 1) return;
              event.preventDefault();
              closeButtonRef.current?.focus();
            }
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            className="image-lightbox__close"
            aria-label={closeLabel}
            onClick={() => setIsOpen(false)}
          >
            <span aria-hidden="true">&times;</span>
          </button>
          <img
            ref={imageRef}
            className={`image-lightbox__image${zoom.scale > 1 ? ' is-zoomed' : ''}`}
            src={imageSrc}
            alt={alt}
            draggable={false}
            style={{ transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})` }}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onError={handleImageError}
          />
          <div className="image-lightbox__zoom-controls" aria-label={zoomControlsLabel}>
            <button type="button" aria-label={zoomOutLabel} disabled={zoom.scale === 1} onClick={() => setScale(zoom.scale / 1.2)}>
              &minus;
            </button>
            <span>{Math.round(zoom.scale * 100)}%</span>
            <button type="button" aria-label={zoomInLabel} disabled={zoom.scale === 5} onClick={() => setScale(zoom.scale * 1.2)}>
              +
            </button>
            <button type="button" aria-label={resetZoomLabel} disabled={zoom.scale === 1} onClick={() => setZoom({ scale: 1, x: 0, y: 0 })}>
              1:1
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default ImageLightbox;
