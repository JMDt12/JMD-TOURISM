import { Link } from 'react-router-dom';
import Artwork from './Artwork.jsx';

export const Card = ({ className = '', children, ...rest }) => (
  <div className={`card ${className}`} {...rest}>{children}</div>
);

export const Badge = ({ tone = 'neutral', children }) => {
  const tones = {
    neutral: 'bg-paper-2 text-ink-soft border-line',
    verified: 'bg-peacock-100 text-peacock border-peacock/25',
    warn: 'bg-marigold-100 text-marigold-dark border-marigold/30',
    live: 'bg-sindoor-100 text-sindoor border-sindoor/25',
    ink: 'bg-indigo-100 text-indigo-brand border-indigo-brand/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
};

export const Stars = ({ value = 0, count, size = 'sm' }) => {
  const full = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-1 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <span className="text-marigold" aria-hidden="true">
        {'★'.repeat(full)}<span className="text-line">{'★'.repeat(5 - full)}</span>
      </span>
      <span className="font-semibold">{Number(value).toFixed(1)}</span>
      {count != null && <span className="text-ink-soft">({count})</span>}
      <span className="sr-only">{Number(value).toFixed(1)} out of 5</span>
    </span>
  );
};

/**
 * A real photograph when we have one, our own illustration when we do not.
 *
 * We never pass off stock photography as our own fleet or our own people, so
 * the fallback is drawn in-house and obviously drawn. Pass `scene` to pick
 * which illustration suits — see Artwork for the set.
 */
export function PhotoSlot({
  src, alt, label = 'Photo', name, scene = 'temple', className = '', ratio = 'aspect-[4/3]',
}) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={`${ratio} w-full rounded-xl object-cover ${className}`} />;
  }
  return (
    <div className={`${ratio} w-full overflow-hidden rounded-xl border border-line bg-paper-2 ${className}`}>
      <Artwork variant={scene} title={alt} />
    </div>
  );
}

/** A small round stand-in for a person, used where a face would go. */
export function Avatar({ src, alt, name = '', className = 'w-14' }) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy"
                className={`${className} aspect-square rounded-full object-cover`} />;
  }
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <span
      className={`${className} grid aspect-square shrink-0 place-items-center rounded-full bg-indigo-brand font-display text-lg text-marigold`}
      role="img"
      aria-label={alt}
    >
      {initials || '·'}
    </span>
  );
}

export const Spinner = ({ label = 'Loading' }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft">
    <span className="size-4 animate-spin rounded-full border-2 border-line border-t-indigo-brand" />
    {label}…
  </div>
);

export const ErrorNote = ({ error, onRetry }) => (
  <div className="rounded-xl border border-sindoor/30 bg-sindoor-100 p-4 text-sm text-sindoor">
    <p className="font-semibold">{error?.message || 'Something went wrong.'}</p>
    {onRetry && (
      <button className="btn btn-ghost mt-3 py-1.5 text-xs" onClick={onRetry}>Try again</button>
    )}
  </div>
);

export const Empty = ({ title, hint, action }) => (
  <div className="rounded-xl border border-dashed border-line bg-white/60 p-8 text-center">
    <p className="font-display text-lg">{title}</p>
    {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Field = ({ label, hint, children, id }) => (
  <div>
    <label className="label" htmlFor={id}>{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
  </div>
);

export const SectionHead = ({ eyebrow, title, action }) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
    <div>
      {eyebrow && (
        <p className="text-[11px] font-bold tracking-[0.14em] text-marigold-dark uppercase">{eyebrow}</p>
      )}
      <h2 className="font-display text-xl sm:text-2xl">{title}</h2>
    </div>
    {action}
  </div>
);

/** The "book from the source" promise, reused across the app. */
export const SourceBadge = ({ compact = false }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-marigold/30 bg-marigold-100 px-2.5 py-1 text-[11px] font-semibold text-marigold-dark">
    <span aria-hidden="true">◆</span>
    {compact ? 'Mathura HQ' : 'Operated from Mathura, not resold'}
  </span>
);

/**
 * The tricolour, drawn rather than emoji: Windows renders the 🇮🇳 flag
 * emoji as the letters "IN", which is exactly the wrong thing here.
 */
export const IndiaFlag = ({ className = 'h-3.5' }) => (
  <svg viewBox="0 0 36 24" className={`${className} w-auto rounded-[2px] shadow-sm`}
       role="img" aria-label="India">
    <rect width="36" height="8" fill="#FF9933" />
    <rect y="8" width="36" height="8" fill="#FFFFFF" />
    <rect y="16" width="36" height="8" fill="#138808" />
    <g stroke="#000080" strokeWidth="0.35" fill="none">
      <circle cx="18" cy="12" r="3.1" strokeWidth="0.6" />
      {/* The Ashoka Chakra has 24 spokes. */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * Math.PI) / 12;
        return (
          <line
            key={i}
            x1={18 + Math.cos(a) * 0.5}
            y1={12 + Math.sin(a) * 0.5}
            x2={18 + Math.cos(a) * 3.1}
            y2={12 + Math.sin(a) * 3.1}
          />
        );
      })}
    </g>
    <circle cx="18" cy="12" r="0.55" fill="#000080" />
  </svg>
);

export const LinkButton = ({ to, children, variant = 'primary', className = '', ...rest }) => (
  <Link to={to} className={`btn btn-${variant} ${className}`} {...rest}>{children}</Link>
);
