# Guia de Tema - Time2Cloud

Este documento explica como personalizar as cores e fontes da aplicação.

## 📁 Estrutura do Tema

O tema está configurado em três lugares principais:

1. **`src/theme/theme.config.ts`** - Configuração TypeScript do tema
2. **`tailwind.config.js`** - Configuração do Tailwind CSS
3. **`src/index.css`** - Variáveis CSS e classes utilitárias

## 🎨 Como Alterar as Cores

### Opção 1: Alterar no Tailwind Config (Recomendado)

Edite o arquivo `tailwind.config.js` e modifique as cores na seção `theme.extend.colors`:

```javascript
colors: {
  primary: {
    500: '#3b82f6', // Cor principal - altere aqui
    600: '#2563eb', // Cor hover - altere aqui
    // ... outras variações
  },
  // ... outras cores
}
```

### Opção 2: Alterar Variáveis CSS

Edite o arquivo `src/index.css` e modifique as variáveis CSS:

```css
:root {
  --color-primary-500: #3b82f6; /* Altere aqui */
  --color-primary-600: #2563eb;   /* Altere aqui */
  /* ... outras variáveis */
}
```

### Opção 3: Alterar no Theme Config

Edite o arquivo `src/theme/theme.config.ts`:

```typescript
export const theme = {
  colors: {
    primary: {
      500: '#3b82f6', // Altere aqui
      600: '#2563eb', // Altere aqui
    },
  },
}
```

## 🔤 Como Alterar as Fontes

### Alterar Fonte Principal

1. **No Tailwind Config** (`tailwind.config.js`):
```javascript
fontFamily: {
  sans: ['Sua Fonte', 'system-ui', 'sans-serif'],
}
```

2. **No CSS** (`src/index.css`):
```css
@import url('https://fonts.googleapis.com/css2?family=Sua+Fonte&display=swap');

body {
  font-family: 'Sua Fonte', system-ui, sans-serif;
}
```

## 🎯 Classes Utilitárias Disponíveis

### Botões
- `.btn-primary` - Botão primário (azul)
- `.btn-secondary` - Botão secundário (cinza)
- `.btn-success` - Botão de sucesso (verde)
- `.btn-error` - Botão de erro (vermelho)

### Inputs
- `.input-base` - Input padrão com foco estilizado

### Cards
- `.card` - Card com sombra e borda

### Badges
- `.badge` - Badge base
- `.badge-primary` - Badge primário
- `.badge-success` - Badge de sucesso
- `.badge-warning` - Badge de aviso
- `.badge-error` - Badge de erro

## 🎨 Paleta de Cores Atual

### Primária (Azul)
- Usada para ações principais, links ativos, botões primários
- Cores: `primary-500` a `primary-900`

### Secundária (Cinza)
- Usada para textos secundários, backgrounds, bordas
- Cores: `secondary-50` a `secondary-950`

### Sucesso (Verde)
- Usada para indicar sucesso, aprovações
- Cores: `success-500` a `success-900`

### Aviso (Amarelo/Laranja)
- Usada para alertas, pendências
- Cores: `warning-500` a `warning-900`

### Erro (Vermelho)
- Usada para erros, rejeições, ações destrutivas
- Cores: `error-500` a `error-900`

## 📝 Exemplo de Uso

```tsx
// Botão primário
<button className="btn-primary">Salvar</button>

// Botão secundário
<button className="btn-secondary">Cancelar</button>

// Input
<input className="input-base" type="text" />

// Card
<div className="card">
  <h2>Título</h2>
  <p>Conteúdo</p>
</div>

// Badge
<span className="badge badge-success">Aprovado</span>
```

## 🔄 Após Alterar o Tema

1. Salve os arquivos
2. O Vite recarregará automaticamente
3. Se não funcionar, reinicie o servidor de desenvolvimento

## 💡 Dicas

- Use as classes utilitárias do Tailwind para cores: `bg-primary-500`, `text-primary-600`, etc.
- Mantenha consistência usando as classes pré-definidas (`.btn-primary`, `.input-base`, etc.)
- Para cores customizadas, adicione no `tailwind.config.js` na seção `extend.colors`

