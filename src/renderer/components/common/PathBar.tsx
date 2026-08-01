interface Props {
  kind: 'file' | 'directory'
  leftPath: string | null
  rightPath: string | null
  leftDirty?: boolean
  rightDirty?: boolean
  onPick: (side: 'left' | 'right') => void
  onSetPath: (side: 'left' | 'right', path: string) => void
}

const LABEL = {
  file: 'Elegir archivo…',
  directory: 'Elegir carpeta…'
}

export function PathBar({
  kind,
  leftPath,
  rightPath,
  leftDirty,
  rightDirty,
  onPick,
  onSetPath
}: Props): React.JSX.Element {
  const slot = (side: 'left' | 'right', path: string | null, dirty?: boolean): React.JSX.Element => (
    <div className="path-slot">
      {dirty && <span className="dirty-dot" title="Hay cambios sin guardar">●</span>}
      <input
        type="text"
        value={path ?? ''}
        placeholder={kind === 'file' ? 'Ruta del archivo' : 'Ruta de la carpeta'}
        spellCheck={false}
        onChange={(event) => onSetPath(side, event.target.value)}
        title={path ?? ''}
      />
      <button onClick={() => onPick(side)} title={LABEL[kind]}>
        …
      </button>
    </div>
  )

  return (
    <div className="path-bar">
      {slot('left', leftPath, leftDirty)}
      {slot('right', rightPath, rightDirty)}
    </div>
  )
}
