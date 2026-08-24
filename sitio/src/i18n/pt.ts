import type { Catalog } from './index'

export const pt: Catalog = {
  meta: {
    title: 'Cotejo — compare arquivos de texto e pastas lado a lado',
    description:
      'Aplicativo de desktop livre para Windows, macOS e Linux. Compare dois arquivos de texto ou duas pastas inteiras, edite os dois lados e copie as mudanças de um para o outro.'
  },

  nav: {
    skip: 'Ir para o conteúdo',
    text: 'Texto',
    folders: 'Pastas',
    colors: 'Cores',
    downloads: 'Downloads',
    github: 'GitHub',
    language: 'Idioma',
    main: 'Principal'
  },

  hero: {
    lede:
      'O Cotejo compara <strong>arquivos de texto</strong> e <strong>pastas inteiras</strong>. Mostra os dois lado a lado, linha por linha, deixa você editar os dois e copiar as mudanças de um para o outro. Para Windows, macOS e Linux.',
    download: 'Baixar o Cotejo',
    source: 'Ver o código',
    latestVersion: 'Última versão',
    freeSoftware: 'Software livre',
    license: 'Gratuito, com licença MIT',
    privacy: 'Sem conta, sem anúncios, sem telemetria'
  },

  preview: {
    tab: 'relatorio.txt ↔ relatorio.txt',
    versions: 'junho · julho',
    alt:
      'Comparação de duas versões de um arquivo de texto: a linha 3 muda de 1.240 para 1.310 unidades, a linha “Região: norte” só existe à esquerda e “Revisado por: Luis” só à direita.',
    caption:
      'Âmbar: a linha existe nos dois lados, mas mudou, com a palavra exata destacada dentro dela. Verde-azulado: a linha só existe em um lado, e um vão hachurado guarda o lugar do outro para que as duas colunas nunca se desencontrem. As setas da faixa central copiam essa diferença para o outro lado.',
    doc: {
      title: 'Relatório trimestral',
      salesPre: 'Vendas: ',
      salesOld: '1.240',
      salesNew: '1.310',
      salesPost: ' unidades',
      returns: 'Devoluções: 38',
      region: 'Região: norte',
      owner: 'Responsável: Ana',
      closing: 'Fechamento: 30 de junho',
      reviewer: 'Revisado por: Luis'
    }
  },

  text: {
    eyebrow: 'Comparar texto',
    h2: 'Ver a diferença e resolver ali mesmo',
    lede:
      'Os dois painéis são editáveis. Não precisa abrir outro programa para aplicar o que você acabou de ver.',
    aligned: {
      h3: 'Sem desencontro',
      p: 'As linhas emparelhadas ficam frente a frente e os vãos ocupam o lugar delas, então os dois painéis têm exatamente a mesma altura e nunca saem de sincronia na rolagem.'
    },
    inline: {
      h3: 'A palavra exata que mudou',
      p: 'Dentro de uma linha alterada, destaca-se só o trecho diferente, não a linha inteira. Um mapa lateral resume o arquivo todo e salta para qualquer diferença com um clique.'
    },
    transfer: {
      h3: 'Copiar de um lado para o outro',
      p: 'As setas da faixa central levam um bloco para o outro lado. Se quiser menos, selecione o texto e transfira só aquelas linhas. Tudo entra no histórico de edição, então desfaz como qualquer outra alteração.'
    },
    noFiles: {
      h3: 'Também sem arquivos',
      p: 'Escreva ou cole dois textos nos painéis e a comparação funciona igual. Misturar também vale: um arquivo de um lado e algo colado do outro.'
    },
    save: {
      h3: 'Salva como estava',
      p: 'Cada lado tem seu próprio botão de salvar, e as quebras de linha e o BOM originais são preservados. Editar uma linha não reescreve as outras mil.'
    },
    safeSave: {
      h3: 'Salvar não passa por cima de nada',
      p: 'Se o arquivo mudou no disco desde que você o abriu, o Cotejo não escreve: ele avisa e você escolhe entre recarregar ou salvar mesmo assim. A escrita passa por um arquivo temporário e uma troca de nome por cima, então uma queda no meio nunca deixa o arquivo pela metade.'
    },
    ignore: {
      h3: 'O que você decidir ignorar',
      p: 'Espaços, maiúsculas, linhas em branco e largura da tabulação. O que é ignorado fica cinza em vez de sumir, para você saber que continua ali.'
    }
  },

  folders: {
    eyebrow: 'Comparar pastas',
    h2: 'Duas árvores frente a frente, com as operações onde você precisa',
    lede:
      'Cada item com seu tamanho e sua data nos dois lados, alinhados linha a linha. Onde algo existe só de um lado, o outro fica com o mesmo vão hachurado do comparador de texto.',
    tableCaption: 'Modos de comparação de pastas',
    colMode: 'Modo',
    colWhat: 'O que compara',
    colWhen: 'Quando usar',
    quick: {
      name: 'Rápido',
      what: 'Tamanho e data, com 2 s de tolerância',
      when: 'O uso do dia a dia'
    },
    size: {
      name: 'Só tamanho',
      what: 'Apenas o tamanho',
      when: 'Varreduras muito grandes'
    },
    content: {
      name: 'Conteúdo',
      what: 'Hash sha256 lido em streaming',
      when: 'Quando não dá para confiar na data'
    },
    ops: {
      h3: 'Copiar, mover, excluir e sincronizar',
      p: 'Pela própria tabela, nos dois sentidos. Tudo que é destrutivo ou sobrescreve pede confirmação mostrando antes quantos arquivos são, quantos bytes e a lista do que será sobrescrito.'
    },
    trash: {
      h3: 'As exclusões vão para a lixeira',
      p: 'A do sistema: a do Windows, a do macOS ou a do desktop Linux que estiver em uso. Se errar, você recupera de onde sempre.'
    },
    filters: {
      h3: 'Filtros que fazem diferença',
      pBefore:
        'Padrões de inclusão e exclusão, e arquivos ocultos opcionais. Excluir uma pasta também evita percorrê-la, então descartar ',
      pAfter: ' não custa tempo: economiza.'
    },
    open: {
      h3: 'Da árvore para o texto',
      p: 'Clique duplo em um arquivo diferente e ele abre comparado em uma aba nova. Se essa comparação já estava aberta, ele salta para ela em vez de duplicá-la.'
    },
    keyboard: {
      h3: 'A tabela também pelo teclado',
      p: 'Setas para cima e para baixo para se mover, direita e esquerda para abrir e fechar pastas, Home e End para os extremos, Page Up e Page Down para saltar uma tela, Espaço para incluir ou tirar da seleção e Enter para abrir a comparação daquela linha.'
    }
  },

  colors: {
    eyebrow: 'Como ler',
    h2: 'Quente contra frio, não vermelho contra verde',
    lede:
      'Distingue-se melhor nos daltonismos mais comuns e deixa o vermelho com um significado só: isto destrói alguma coisa. Todos os textos cumprem contraste WCAG de 4.5:1, no tema claro e no escuro.',
    tableCaption: 'O que cada cor significa',
    colColor: 'Cor',
    colMeaning: 'Significa',
    amber: {
      name: 'Âmbar',
      meaning: 'A linha existe nos dois lados, mas mudou. A palavra exata vai destacada dentro.'
    },
    teal: {
      name: 'Verde-azulado',
      meaning: 'A linha só existe em um lado. O outro mostra um vão hachurado.'
    },
    gray: {
      name: 'Cinza atenuado',
      meaning:
        'Diferem só em algo que você pediu para ignorar: espaços, maiúsculas ou linhas em branco.'
    },
    red: {
      name: 'Vermelho',
      meaning: 'Só em avisos de ações destrutivas. Nunca é um tipo de diferença.'
    }
  },

  downloads: {
    eyebrow: 'Downloads',
    h2: 'Baixar o Cotejo',
    lede:
      'Cada sistema tem uma versão que instala e outra que roda sem instalar. As duas levam o mesmo aplicativo dentro.',
    yourSystem: 'seu sistema',
    recommended: 'recomendado',
    releaseNotes: 'Notas desta versão',
    olderVersions: 'Versões anteriores',
    fallback:
      'Os links diretos não puderam ser gerados na compilação desta página. <a href="https://github.com/carlosalbertoxw/cotejo-file-comparison/releases">Baixe a última versão pelo GitHub</a>, onde ficam sempre todos os instaladores.',
    notes: {
      windows:
        'O Windows avisa na primeira vez que o editor é desconhecido, porque o aplicativo não é assinado: Mais informações → Executar assim mesmo.',
      macos:
        'Sem assinatura da Apple, o macOS bloqueia na primeira vez com um aviso que parece de arquivo danificado. Abra com clique direito no aplicativo → Abrir, e a partir daí funciona normalmente.',
      linux:
        'O AppImage precisa de permissão de execução na primeira vez, com chmod +x, e depois abre com clique duplo.'
    },
    items: {
      windowsInstaller: {
        label: 'Instalador',
        detail: 'Instala e cria o atalho. O de sempre.'
      },
      windowsPortable: {
        label: 'Portátil',
        detail: 'Um único .exe que roda sem instalar nada.'
      },
      macArm64Dmg: {
        label: 'Apple Silicon (.dmg)',
        detail: 'Mac com chip M1 ou mais novo.'
      },
      macIntelDmg: {
        label: 'Intel (.dmg)',
        detail: 'Mac com processador Intel.'
      },
      macArm64Zip: {
        label: 'Apple Silicon (.zip)',
        detail: 'O aplicativo solto, sem instalador.'
      },
      macIntelZip: {
        label: 'Intel (.zip)',
        detail: 'O aplicativo solto, sem instalador.'
      },
      linuxDeb: {
        label: 'Debian / Ubuntu (.deb)',
        detail: 'Instala pelo gerenciador de pacotes do sistema.'
      },
      linuxRpm: {
        label: 'Fedora / RHEL (.rpm)',
        detail: 'Instala pelo gerenciador de pacotes do sistema.'
      },
      linuxAppImage: {
        label: 'AppImage',
        detail: 'Um arquivo só. Dê chmod +x e abra.'
      }
    }
  },

  faq: {
    h2: 'Antes de instalar',
    price: {
      q: 'Custa alguma coisa?',
      a: 'Não. É software livre com licença MIT, sem versão paga, sem conta e sem anúncios. O código está publicado inteiro.'
    },
    privacy: {
      q: 'Ele manda meus arquivos para algum lugar?',
      a: 'Não. Tudo acontece no seu computador. A única conexão que ele faz é perguntar ao GitHub uma vez por dia se existe versão mais nova, e sem rede ele fica quieto e continua funcionando.'
    },
    updates: {
      q: 'Ele se atualiza sozinho?',
      a: 'Não: ele avisa e traz você para cá. Substituir o executável por conta própria exigiria um aplicativo assinado, e isso pede certificados pagos. O aviso pode ser fechado e não volta para aquela mesma versão.'
    },
    languages: {
      q: 'Em que idiomas ele está?',
      a: 'Espanhol, inglês, francês e português do Brasil. Ele pega o do sistema no primeiro início e pode ser trocado a qualquer momento. As datas e os tamanhos seguem o idioma ativo.'
    },
    large: {
      q: 'Ele aguenta arquivos grandes?',
      a: 'A comparação roda fora da thread da interface, então a janela continua respondendo enquanto ele calcula. Em pastas não há limite de tamanho: o modo conteúdo lê os arquivos em streaming, e comparar duas imagens de disco custa a mesma memória que comparar duas anotações. Um arquivo de texto abre até 12 MB, que é o que o aplicativo aguenta de verdade; acima disso ele avisa em vez de tentar e ficar sem memória.'
    },
    encoding: {
      q: 'E os arquivos que não estão em UTF-8?',
      a: 'Abrem em somente leitura: dá para comparar normalmente, mas não editar. Ler um .txt antigo em Windows-1252 perde os acentos, e salvar por cima gravaria essa perda no disco. Uma faixa avisa ao abrir.'
    },
    bugs: {
      q: 'Como relato um problema?',
      a: 'Nas <a href="https://github.com/carlosalbertoxw/cotejo-file-comparison/issues">issues do repositório</a>. Conte o que você fez, o que esperava e o que aconteceu; costuma bastar.'
    }
  },

  footer: {
    license: 'MIT © {year} Carlos Alberto',
    source: 'Código-fonte',
    allVersions: 'Todas as versões',
    report: 'Relatar um problema'
  }
}
