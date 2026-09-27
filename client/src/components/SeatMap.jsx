/**
 * Seat plan for a chartered vehicle.
 *
 * Nothing here is selectable: the customer buys the whole bus, so this exists
 * to show what they are getting — the layout, the deck count and the real
 * seat count — rather than to pick from an inventory.
 */
export default function SeatMap({ decks = [], capacity }) {
  return (
    <div className="space-y-5">
      {decks.map((deck) => (
        <div key={deck.name}>
          {decks.length > 1 && <p className="label mb-2">{deck.name} deck</p>}
          <div className="overflow-x-auto">
            <div className="inline-block rounded-xl border border-line bg-paper-2 p-3">
              <div className="mb-2 flex justify-end pr-1">
                <span className="text-[10px] font-semibold tracking-wide text-ink-soft uppercase">
                  Front ▲
                </span>
              </div>
              <div className="space-y-2">
                {deck.rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex gap-2">
                      {row.left.map((s) => <Seat key={s.id} id={s.id} />)}
                    </div>
                    <div className="w-6" aria-hidden="true" />
                    <div className="flex gap-2">
                      {row.right.map((s) => <Seat key={s.id} id={s.id} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      <p className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-peacock/40 bg-peacock-100" />
          All {capacity} seats included
        </span>
        <span>· No stranger sits with your group.</span>
      </p>
    </div>
  );
}

const Seat = ({ id }) => (
  <span
    className="grid size-10 shrink-0 place-items-center rounded-lg border border-peacock/40 bg-peacock-100 text-[11px] font-semibold text-peacock"
    aria-hidden="true"
  >
    {id}
  </span>
);
