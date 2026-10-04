import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MOD_LABEL } from '../../platform'

interface Props {
  kind: 'file' | 'directory'
  leftPath: string | null
  rightPath: string | null
  leftDirty?: boolean
  rightDirty?: boolean
  onPick: (side: 'left' | 'right') => void
  /** Una ruta terminada de escribir: con Intro o al salir del campo. */
  onSetPath: (side: 'left' | 'right', path: string) => void
  /** Si se pasa, cada lado gana su propio boton de guardado. */
  onSave?: (side: 'left' | 'right') => void
}

/**
 * El campo de una ruta.
 *
 * Lo que se escribe es un borrador hasta que se confirma con Intro o al salir
 * del campo; Escape lo deshace. Antes cada tecla cambiaba la ruta de la
 * pestana, y cada cambio de ruta carga: escribir `C:\proyecto\notas.txt`
 * intentaba abrir `C`, `C:`, `C:\`... —en la vista de carpetas, comparando el
 * disco entero—, y una sola tecla en un panel con cambios sin guardar los
 * sustituia por lo que hubiera en el disco.
 */
function PathInput({
  path,
  placeholder,
  onCommit
}: {
  path: string | null
  placeholder: string
  onCommit: (path: string) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState(path ?? '')
  // La ruta tambien cambia desde fuera: el dialogo de elegir, la linea de
  // comandos o el historial. Entonces manda la de fuera.
  const [shown, setShown] = useState(path)
  if (path !== shown) {
    setShown(path)
    setDraft(path ?? '')
  }

  const commit = (): void => {
    // El campo vuelve a ensenar la ruta vigente: si quien recibe la nueva la
    // acepta, llegara por `path`; si antes pregunta y se cancela, no queda en
    // el campo una ruta que no es la que esta abierta.
    setDraft(path ?? '')
    if (draft !== '' && draft !== path) onCommit(draft)
  }

  return (
    <input
      type="text"
      value={draft}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          // Si confirmar abre la pregunta de cambios sin guardar, su boton
          // principal recibe el foco al instante, y el resto de esta misma
          // pulsacion lo activaria: guardaria sin que nadie lo eligiera.
          event.preventDefault()
          commit()
        }
        // Sin salir del campo: al salir se confirma, y el borrador que veria
        // ese `onBlur` todavia seria el de antes de deshacer.
        if (event.key === 'Escape') setDraft(path ?? '')
      }}
      onBlur={commit}
      title={path ?? ''}
    />
  )
}

export function PathBar({
  kind,
  leftPath,
  rightPath,
  leftDirty,
  rightDirty,
  onPick,
  onSetPath,
  onSave
}: Props): React.JSX.Element {
  const { t } = useTranslation()

  const slot = (side: 'left' | 'right', path: string | null, dirty?: boolean): React.JSX.Element => (
    <div className="path-slot">
      {dirty && <span className="dirty-dot" title={t('common.unsavedChanges')}>●</span>}
      <PathInput
        path={path}
        placeholder={t(kind === 'file' ? 'pathBar.filePlaceholder' : 'pathBar.dirPlaceholder')}
        onCommit={(value) => onSetPath(side, value)}
      />
      <button
        onClick={() => onPick(side)}
        title={t(kind === 'file' ? 'pathBar.pickFile' : 'pathBar.pickDirectory')}
      >
        …
      </button>
      {onSave && (
        <button
          onClick={() => onSave(side)}
          disabled={!dirty}
          title={t(side === 'left' ? 'pathBar.saveLeft' : 'pathBar.saveRight', {
            mod: MOD_LABEL
          })}
        >
          {t('pathBar.save')}
        </button>
      )}
    </div>
  )

  return (
    <div className="path-bar">
      {slot('left', leftPath, leftDirty)}
      {slot('right', rightPath, rightDirty)}
    </div>
  )
}
