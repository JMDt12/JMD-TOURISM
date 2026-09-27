import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-display text-5xl text-indigo-brand">404</p>
      <h1 className="mt-2 font-display text-2xl">That page took a wrong turn at Kosi Kalan</h1>
      <p className="mt-2 text-ink-soft">
        The link is broken or the trip has moved on. Try searching for a bus instead.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className="btn btn-primary">Home</Link>
        <Link to="/search" className="btn btn-ghost">Find a bus</Link>
      </div>
    </div>
  );
}
