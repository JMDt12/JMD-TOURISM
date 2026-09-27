/**
 * Seat maps are described declaratively on the bus row so a single renderer
 * works for 2+2 seaters, 2+1 sleepers and tempo travellers alike.
 *
 * seat_layout = { decks: [{ name, prefix, rows, left, right }] }
 */
export function buildSeatMap(layout) {
  const decks = layout?.decks ?? [];
  return decks.map((deck) => {
    const rows = [];
    let n = 0;
    for (let r = 0; r < deck.rows; r += 1) {
      const left = [];
      const right = [];
      for (let i = 0; i < deck.left; i += 1) left.push(`${deck.prefix}${(n += 1)}`);
      for (let i = 0; i < deck.right; i += 1) right.push(`${deck.prefix}${(n += 1)}`);
      rows.push({ left, right });
    }
    return { name: deck.name, prefix: deck.prefix, rows, count: n };
  });
}

/** Flat list of every seat id on a bus, in boarding order. */
export function allSeats(layout) {
  return buildSeatMap(layout).flatMap((deck) =>
    deck.rows.flatMap((row) => [...row.left, ...row.right])
  );
}

export const LAYOUTS = {
  ac_seater_2x2:  { decks: [{ name: 'Deck', prefix: 'S', rows: 10, left: 2, right: 2 }] },
  seater_2x2:     { decks: [{ name: 'Deck', prefix: 'S', rows: 12, left: 2, right: 2 }] },
  ac_sleeper_2x1: {
    decks: [
      { name: 'Lower', prefix: 'L', rows: 6, left: 2, right: 1 },
      { name: 'Upper', prefix: 'U', rows: 6, left: 2, right: 1 },
    ],
  },
  sleeper_2x1: {
    decks: [
      { name: 'Lower', prefix: 'L', rows: 5, left: 2, right: 1 },
      { name: 'Upper', prefix: 'U', rows: 5, left: 2, right: 1 },
    ],
  },
  tempo_12:  { decks: [{ name: 'Cabin', prefix: 'T', rows: 4, left: 2, right: 1 }] },
};
