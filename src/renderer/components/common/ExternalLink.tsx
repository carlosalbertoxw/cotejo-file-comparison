interface Props {
  href: string
  children: React.ReactNode
}

/**
 * Enlace que abre el navegador del sistema en vez de navegar dentro de la
 * ventana. Conserva el `href` a proposito: es lo que hace que se vea la URL al
 * pasar por encima y que el enlace siga siendo un enlace para un lector de
 * pantalla.
 */
export function ExternalLink({ href, children }: Props): React.JSX.Element {
  return (
    <a
      className="external-link"
      href={href}
      title={href}
      onClick={(event) => {
        event.preventDefault()
        void window.api.openExternal(href)
      }}
    >
      {children}
    </a>
  )
}
