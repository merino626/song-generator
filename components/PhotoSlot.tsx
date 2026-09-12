import Image from "next/image";

/**
 * Espaço reservado para imagem real (foto de cliente, print de conversa,
 * reação em vídeo). Enquanto `src` não é passado, mostra um placeholder
 * tracejado com a proporção certa — assim o layout já fica no lugar e é só
 * trocar pela imagem quando ela existir.
 */
export function PhotoSlot({
  src,
  alt,
  label,
  ratio = "square",
  rounded = "rounded-2xl",
  className = "",
}: {
  src?: string;
  alt?: string;
  label?: string;
  ratio?: "square" | "portrait" | "video" | "story";
  rounded?: string;
  className?: string;
}) {
  const ratioClass = {
    square: "aspect-square",
    portrait: "aspect-[4/5]",
    video: "aspect-video",
    story: "aspect-[9/16]",
  }[ratio];

  return (
    <div className={`relative overflow-hidden ${ratioClass} ${rounded} ${className}`}>
      {src ? (
        <Image src={src} alt={alt || ""} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 border-2 border-dashed border-wine-200 bg-wine-50/40 p-3 text-center">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-wine-300" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          {label && <span className="text-[10px] font-medium leading-tight text-wine-400">{label}</span>}
        </div>
      )}
    </div>
  );
}

/** Avatar circular para depoimentos. */
export function AvatarSlot({ src, alt, initials }: { src?: string; alt?: string; initials?: string }) {
  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
      {src ? (
        <Image src={src} alt={alt || ""} fill className="object-cover" sizes="44px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-wine-200 bg-wine-50 text-xs font-semibold text-wine-400">
          {initials || "foto"}
        </div>
      )}
    </div>
  );
}
