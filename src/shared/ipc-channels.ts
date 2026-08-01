// Unica fuente de verdad para los nombres de canal IPC.

export const IPC = {
  // Dialogos
  pickFile: 'dialog:pickFile',
  pickDirectory: 'dialog:pickDirectory',

  // Archivos de texto
  readTextFile: 'fs:readTextFile',
  writeTextFile: 'fs:writeTextFile',
  statPath: 'fs:statPath',

  // Comparacion de directorios
  compareDirectories: 'dir:compare',
  cancelCompare: 'dir:cancelCompare',
  compareProgress: 'dir:progress',

  // Operaciones de archivo
  planFileOp: 'fileop:plan',
  runFileOp: 'fileop:run',
  cancelFileOp: 'fileop:cancel',
  fileOpProgress: 'fileop:progress',

  // Sistema
  showItemInFolder: 'shell:showItemInFolder',
  openPathsFromArgv: 'app:openPathsFromArgv'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
