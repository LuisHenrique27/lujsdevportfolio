# Lujs.dev — Portfólio

Portfólio profissional minimalista com tema **Neobrutalism Minimalism**, dark mode
como padrão, nas cores **preto, branco, azul e verde**.

Feito com **HTML, CSS e JavaScript moderno puro** — sem frameworks, sem
TypeScript, sem etapa de build. Ideal para GitHub Pages.

## Arquivos

| Arquivo       | Função                                             |
| ------------- | -------------------------------------------------- |
| `index.html`  | Página única: Início, Sobre, Habilidades, Projetos, GitHub, Contatos |
| `styles.css`  | Tema Neobrutalism Minimalism (dark por padrão + tema claro) |
| `script.js`   | Menu mobile, tema, reveals ao rolar, animação do console, link ativo da navbar |
| `favicon.svg` | Ícone quadrado do Lujs.dev                         |

Abra `index.html` direto no navegador — nenhuma dependência é necessária.

## Deploy no GitHub Pages

1. Suba estes arquivos para um repositório no GitHub.
2. Em **Settings → Pages**, escolha **Deploy from a branch** e a branch `main`,
   pasta `/ (root)`.
3. O site fica em `https://<usuario>.github.io/<repositorio>/`.

Todos os caminhos são relativos, então funciona na raiz de um domínio próprio
ou em um repositório com nome de projeto.

## Personalizar

- **Projetos:** edite os três `.project-card` em `index.html` (imagem, categoria,
  nome, descrição e link).
- **Contatos:** atualize e-mail, GitHub e LinkedIn na tabela da seção Contatos.
- **Cores:** altere `--blue` e `--green` no topo de `styles.css`.
- **Tema:** dark é o padrão; o botão na navbar alterna para claro e a escolha
  fica salva em `localStorage`.
