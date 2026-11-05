import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ImageLightbox.css';

const MAX_ZOOM = 2.5;

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
  const lightboxRef = useRef(null);
  const imageRef = useRef(null);
  const zoomPercentRef = useRef(null);
  const dragRef = useRef(null);
  const activePointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const zoomRef = useRef(zoom);
  const pendingZoomRef = useRef(zoom);
  const zoomFrameRef = useRef(null);

  const writeZoomTransform = (nextZoom) => {
    if (imageRef.current) {
      imageRef.current.style.transform = `translate3d(${nextZoom.x}px, ${nextZoom.y}px, 0) scale(${nextZoom.scale})`;
    }
    if (zoomPercentRef.current) {
      zoomPercentRef.current.textContent = `${Math.round(nextZoom.scale * 100)}%`;
    }
  };

  const commitZoom = (nextZoom) => {
    if (zoomFrameRef.current !== null) {
      cancelAnimationFrame(zoomFrameRef.current);
      zoomFrameRef.current = null;
    }
    zoomRef.current = nextZoom;
    pendingZoomRef.current = nextZoom;
    setZoom(nextZoom);
    writeZoomTransform(nextZoom);
  };

  const applyGestureZoom = (nextZoom) => {
    pendingZoomRef.current = nextZoom;
    if (zoomFrameRef.current !== null) return;

    zoomFrameRef.current = requestAnimationFrame(() => {
      zoomFrameRef.current = null;
      zoomRef.current = pendingZoomRef.current;
      writeZoomTransform(zoomRef.current);
    });
  };

  useEffect(() => {
    setImageSrc(src);
    commitZoom({ scale: 1, x: 0, y: 0 });
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

  const clampZoom = (nextZoom) => {
    if (nextZoom.scale <= 1) return { scale: 1, x: 0, y: 0 };

    const image = imageRef.current;
    const lightbox = lightboxRef.current;
    if (!image || !lightbox) return nextZoom;

    const maxX = Math.max(0, (image.offsetWidth * nextZoom.scale - (lightbox.clientWidth - 32)) / 2);
    const maxY = Math.max(0, (image.offsetHeight * nextZoom.scale - (lightbox.clientHeight - 64)) / 2);
    return {
      ...nextZoom,
      x: Math.min(maxX, Math.max(-maxX, nextZoom.x)),
      y: Math.min(maxY, Math.max(-maxY, nextZoom.y)),
    };
  };

  const setScale = (nextScale, pointer) => {
    const scale = Math.min(MAX_ZOOM, Math.max(1, nextScale));

    if (scale === 1) {
      commitZoom({ scale: 1, x: 0, y: 0 });
      return;
    }

    const rect = imageRef.current?.getBoundingClientRect();
    const currentZoom = zoomRef.current;
    const ratio = scale / currentZoom.scale;
    const pointerX = pointer ? pointer.x - (rect.left + rect.width / 2) : 0;
    const pointerY = pointer ? pointer.y - (rect.top + rect.height / 2) : 0;

    commitZoom(clampZoom({
      scale,
      x: currentZoom.x + pointerX * (1 - ratio),
      y: currentZoom.y + pointerY * (1 - ratio),
    }));
  };

  const handleWheel = (event) => {
    event.preventDefault();
    setScale(zoomRef.current.scale * (event.deltaY < 0 ? 1.2 : 1 / 1.2), {
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'touch') {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      event.currentTarget.setPointerCapture(event.pointerId);

      const touchPointers = [...activePointersRef.current.values()];
      if (touchPointers.length >= 2) {
        const [first, second] = touchPointers;
        const rect = imageRef.current.getBoundingClientRect();
        pinchRef.current = {
          distance: Math.hypot(second.x - first.x, second.y - first.y),
          midpointX: (first.x + second.x) / 2,
          midpointY: (first.y + second.y) / 2,
          scale: zoomRef.current.scale,
          x: zoomRef.current.x,
          y: zoomRef.current.y,
          centerX: rect.left + rect.width / 2 - zoomRef.current.x,
          centerY: rect.top + rect.height / 2 - zoomRef.current.y,
        };
        dragRef.current = null;
        return;
      }

      if (zoomRef.current.scale > 1) {
        dragRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          zoomX: zoomRef.current.x,
          zoomY: zoomRef.current.y,
        };
      }
      return;
    }

    if (zoomRef.current.scale === 1 || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      zoomX: zoomRef.current.x,
      zoomY: zoomRef.current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const touchPointers = [...activePointersRef.current.values()];
      const pinch = pinchRef.current;

      if (pinch && touchPointers.length >= 2 && pinch.distance > 0) {
        const [first, second] = touchPointers;
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const midpointX = (first.x + second.x) / 2;
        const midpointY = (first.y + second.y) / 2;
        const scale = Math.min(MAX_ZOOM, Math.max(1, pinch.scale * (distance / pinch.distance)));
        const pointX = (pinch.midpointX - pinch.centerX - pinch.x) / pinch.scale;
        const pointY = (pinch.midpointY - pinch.centerY - pinch.y) / pinch.scale;

        applyGestureZoom(clampZoom(scale === 1 ? { scale: 1, x: 0, y: 0 } : {
          scale,
          x: midpointX - pinch.centerX - pointX * scale,
          y: midpointY - pinch.centerY - pointY * scale,
        }));
        return;
      }
    }

    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;

    applyGestureZoom(clampZoom({
      ...zoomRef.current,
      x: dragRef.current.zoomX + event.clientX - dragRef.current.x,
      y: dragRef.current.zoomY + event.clientY - dragRef.current.y,
    }));
  };

  const handlePointerUp = (event) => {
    const wasPinching = Boolean(pinchRef.current);
    if (wasPinching) {
      if (zoomFrameRef.current !== null) {
        cancelAnimationFrame(zoomFrameRef.current);
        zoomFrameRef.current = null;
      }
      zoomRef.current = pendingZoomRef.current;
      writeZoomTransform(zoomRef.current);
    }

    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.delete(event.pointerId);
      if (wasPinching) pinchRef.current = null;

      const remainingPointers = [...activePointersRef.current.entries()];
      if (remainingPointers.length === 1 && zoomRef.current.scale > 1) {
        const [pointerId, pointer] = remainingPointers[0];
        dragRef.current = {
          pointerId,
          x: pointer.x,
          y: pointer.y,
          zoomX: zoomRef.current.x,
          zoomY: zoomRef.current.y,
        };
        return;
      }
    }

    if (dragRef.current?.pointerId === event.pointerId || wasPinching) {
      dragRef.current = null;
      commitZoom(pendingZoomRef.current);
    }
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
          commitZoom({ scale: 1, x: 0, y: 0 });
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
          ref={lightboxRef}
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={alt || openLabel}
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return;

            const focusableButtons = event.currentTarget.querySelectorAll('button');
            const firstButton = focusableButtons[0];
            const lastButton = focusableButtons[focusableButtons.length - 1];

            if (!event.shiftKey && document.activeElement === lastButton) {
              event.preventDefault();
              firstButton.focus();
            } else if (event.shiftKey && document.activeElement === firstButton) {
              event.preventDefault();
              lastButton.focus();
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
            <span ref={zoomPercentRef}>{Math.round(zoom.scale * 100)}%</span>
            <button type="button" aria-label={zoomInLabel} disabled={zoom.scale === MAX_ZOOM} onClick={() => setScale(zoom.scale * 1.2)}>
              +
            </button>
            <button type="button" aria-label={resetZoomLabel} disabled={zoom.scale === 1} onClick={() => commitZoom({ scale: 1, x: 0, y: 0 })}>
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
