const PIP_LAYOUTS = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function PipFace({ value }) {
  const active = new Set(PIP_LAYOUTS[value] ?? [])
  return (
    <div className="domino-tile-face">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={active.has(i) ? 'domino-pip on' : 'domino-pip'} />
      ))}
    </div>
  )
}

export default function DominoTile({ tile, flipped = false, vertical = false, faceDown = false }) {
  const classNames = ['domino-tile', vertical ? 'vertical' : 'horizontal', faceDown ? 'face-down' : '']
  if (faceDown) {
    return <div className={classNames.join(' ')} aria-hidden="true" />
  }
  const [first, second] = flipped ? [tile.b, tile.a] : [tile.a, tile.b]
  return (
    <div className={classNames.join(' ')}>
      <PipFace value={first} />
      <span className="domino-tile-divider" />
      <PipFace value={second} />
    </div>
  )
}
