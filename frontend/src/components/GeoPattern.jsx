// Subtle eight-point-star pattern. Colour comes from the parent's text colour.
export default function GeoPattern({ className = '' }) {
    return (<svg aria-hidden="true" focusable="false" className={className} width="100%" height="100%">
      <defs>
        <pattern id="hia-geo" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M24 4l5.5 13.5L43 24l-13.5 5.5L24 44l-5.5-14.5L5 24l13.5-6.5z" fill="none" stroke="currentColor" strokeWidth="1"/>
          <circle cx="24" cy="24" r="3" fill="none" stroke="currentColor" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hia-geo)"/>
    </svg>);
}
