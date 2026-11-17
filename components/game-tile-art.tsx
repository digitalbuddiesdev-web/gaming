"use client";

import { useState } from "react";

export function GameTileArt({ name, slug, imageUrl }: { name: string; slug: string; imageUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  const h = [...slug].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;
  const showImage = !!imageUrl && !failed;

  return (
    <span
      className="tile-art"
      style={showImage ? undefined : { background: `linear-gradient(145deg, hsl(${h} 45% 24%), hsl(${(h + 45) % 360} 45% 12%))` }}
    >
      {showImage ? (
        <img className="tile-art-img" src={imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
