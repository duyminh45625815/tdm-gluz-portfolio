import Image from "next/image";

// Set to "/images/profile.jpg" after adding the real photo to public/images.
const profileImageSrc: string | null = null;

export default function ProfilePortrait({
  label,
  placeholder,
  caption,
}: {
  label: string;
  placeholder: string;
  caption: string;
}) {
  return (
    <figure className="profile-portrait" aria-label={label}>
      <div className="portrait-frame">
        <div className="portrait-glow" aria-hidden="true" />
        <div className="portrait-grid" aria-hidden="true" />
        <div className="portrait-orbit portrait-orbit-one" aria-hidden="true" />
        <div className="portrait-orbit portrait-orbit-two" aria-hidden="true" />
        <span className="portrait-cross portrait-cross-one" aria-hidden="true" />
        <span className="portrait-cross portrait-cross-two" aria-hidden="true" />

        {profileImageSrc ? (
          <Image
            className="portrait-image"
            src={profileImageSrc}
            alt={label}
            fill
            priority
            sizes="(max-width: 680px) 90vw, (max-width: 1100px) 42vw, 480px"
          />
        ) : (
          <div className="portrait-placeholder">
            <span className="portrait-placeholder-mark" aria-hidden="true">
              TDM
            </span>
            <span className="portrait-placeholder-label">{placeholder}</span>
          </div>
        )}

        <figcaption className="portrait-caption">
          <span className="portrait-caption-dot" aria-hidden="true" />
          {caption}
        </figcaption>
        <span className="portrait-index" aria-hidden="true">
          TDM / 01
        </span>
      </div>
    </figure>
  );
}
