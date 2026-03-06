import React, { useState, useCallback } from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Low-resolution placeholder or base64 data URI for blur effect */
  placeholderSrc?: string;
  /** Alt text (required for accessibility) */
  alt: string;
}

/**
 * Image component that uses native lazy loading with a blur-up placeholder effect.
 * Renders with loading="lazy" and decoding="async" for performance.
 * Shows a blurred placeholder until the full image loads.
 */
function LazyImageInner({ placeholderSrc, alt, className = "", style, onLoad, ...rest }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setLoaded(true);
      onLoad?.(e);
    },
    [onLoad],
  );

  const placeholderStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: (style?.objectFit as React.CSSProperties["objectFit"]) || "cover",
    filter: "blur(20px)",
    transform: "scale(1.1)",
    transition: "opacity 0.3s ease-out",
    opacity: loaded ? 0 : 1,
    pointerEvents: "none",
  };

  const imgStyle: React.CSSProperties = {
    ...style,
    transition: "opacity 0.3s ease-out",
    opacity: loaded ? 1 : 0,
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ display: "inline-block" }}>
      {placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          style={placeholderStyle}
        />
      )}
      {!placeholderSrc && !loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, #1a2332 0%, #0f1923 100%)",
            transition: "opacity 0.3s ease-out",
            opacity: loaded ? 0 : 1,
          }}
          className="animate-pulse"
        />
      )}
      <img
        {...rest}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={imgStyle}
        onLoad={handleLoad}
      />
    </div>
  );
}

const LazyImage = React.memo(LazyImageInner);
export default LazyImage;
