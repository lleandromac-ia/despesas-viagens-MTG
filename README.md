# Dashboard de Despesas de Viagem

Uma dashboard moderna, responsiva e profissional para gerenciamento de despesas de viagem, desenvolvida com HTML, CSS e JavaScript puro.

## 📋 Características

### 1. **Dashboard Principal**
- **Cards de Estatísticas:**
  - Total de Despesas (últimos 6 meses)
  - Quantidade de Lançamentos
  - Ticket Médio (valor médio por transação)
  - Contagem de Modalidades (Cartão, Numerário, Agência)

### 2. **Gráficos Interativos**
- **Despesas por Categoria** - Gráfico de barras horizontais
- **Tendência de Despesas** - Gráfico de linhas com evolução mensal
- **Despesas por Departamento** - Gráfico de pizza
- **Distribuição por Modalidade** - Gráfico de pizza

### 3. **Filtros Avançados**
- Filtro por Categoria de Despesa
- Filtro por Departamento
- Filtro por Funcionário
- Filtro por Modalidade (Numerário, Agência de Viagens, Cartão Corporativo)
- Botão para limpar todos os filtros

### 4. **Página de Lançamentos**
- Tabela detalhada com todas as transações
- Busca em tempo real
- Paginação (20 linhas por página)
- Exportação de dados em CSV
- Modal com detalhes completos da transação

### 5. **Design & UX**
- Interface 100% responsiva (Desktop, Tablet, Mobile)
- Animações suaves e fluidas
- Paleta de cores verde profissional (inspirado em Donezo)
- Tema moderno com cards elevados e sombras
- Sidebar colapsável em dispositivos móveis

## 🚀 Como Usar

### Instalação
1. Coloque os 4 arquivos no mesmo diretório:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `dados.csv`

2. Instale as dependências: `npm install`

3. Inicie o servidor: `npm start`

4. Abra `http://localhost:8080` em um navegador web moderno

### Navegação
- **Dashboard:** Visualize cards de resumo e gráficos interativos
- **Lançamentos:** Acesse a tabela detalhada de todas as transações

### Filtros
1. Selecione um ou mais filtros abaixo dos cards
2. A dashboard atualiza automaticamente
3. Clique em "Limpar Filtros" para resetar

### Exportação
- Clique em "📥 Exportar CSV" na página de Lançamentos
- Um arquivo CSV será baixado com os dados filtrados

## 📊 Dados de Exemplo

O arquivo `dados.csv` contém 200 registros mockados com:
- **Data:** Últimos 6 meses (outubro 2025 - abril 2026)
- **Funcionários:** Diversos funcionários cadastrados
- **Departamentos:** Vendas, Financeiro, Operações, RH
- **Modalidades:** 
  - NUMERÁRIO
  - AGÊNCIA DE VIAGENS
  - CARTÃO CORPORATIVO
- **Categorias:**
  - Hospedagem
  - Passagem Aérea
  - Combustível
  - Refeições
  - Pedágio
  - Estacionamento
- **Valores:** De R$ 28 a R$ 850

## 🎨 Personalização

### Alterar Cores
Edite as variáveis CSS em `styles.css`:
```css
:root {
    --primary-color: #2d5016;        /* Cor principal verde */
    --secondary-color: #4caf50;      /* Cor secundária */
    --accent-color: #ff9800;         /* Cor de destaque */
    /* ... */
}
```

### Adicionar Dados
Edite o arquivo `dados.csv` seguindo o formato:
```
modalidade,data,nome_funcionario,departamento,descricao_despesa,categoria_despesa,valor
CARTÃO CORPORATIVO,2025-10-15,João Silva,Vendas,Hospedagem Hotel,Hospedagem,450.00
```

## 📱 Responsividade

- **Desktop (> 1200px):** Layout completo com sidebar lateral
- **Tablet (768px - 1200px):** Sidebar compactada, menu em hamburger
- **Mobile (< 768px):** Layout vertical com menu colapsável
- **Small Mobile (< 480px):** Otimizado para telas pequenas

## 🛠️ Tecnologias Utilizadas

- **HTML5:** Estrutura semântica
- **CSS3:** Layout responsivo, Flexbox, Grid, Animações
- **JavaScript Vanilla:** Sem dependências (exceto Chart.js)
- **Chart.js 3.9.1:** Gráficos interativos
- **CSV Parser:** Processamento de dados customizado

## ⚡ Recursos Especiais

### Animações
- Fade In/Out
- Slide Up/Down/Left
- Hover Effects nos cards
- Transições suaves nos gráficos

### Performance
- Carregamento rápido
- Renderização eficiente
- Paginação para grande volume de dados
- Caching de gráficos

### Acessibilidade
- Labels descritivos
- Navegação com teclado
- Contraste adequado
- Estrutura semântica

## 🔍 Funcionalidades Avançadas

1. **Filtros Dinâmicos:** Os filtros atualizam os gráficos em tempo real
2. **Busca na Tabela:** Filtre registros conforme digita
3. **Modal Detalhes:** Veja informações completas de cada transação
4. **Exportação CSV:** Baixe dados filtrados em qualquer momento
5. **Paginação Inteligente:** Navegue entre páginas sem perder filtros

## 📈 Exemplos de Uso

### Analisar despesas por categoria
1. Vá ao Dashboard
2. Use o gráfico de barras "Despesas por Categoria"
3. Veja qual categoria tem maior gasto

### Filtrar por departamento
1. Selecione um departamento no filtro
2. Todos os cards, gráficos e tabelas atualizam automaticamente
3. Clique em "Limpar Filtros" para resetar

### Exportar dados de um funcionário
1. Filtre por funcionário
2. Clique em "📥 Exportar CSV"
3. O arquivo download contém apenas os dados filtrados

## 🐛 Resolução de Problemas

**Dados não carregam:**
- Verifique se o arquivo `dados.csv` está no mesmo diretório
- Confirme o formato do CSV
- Abra o console (F12) para verificar erros

**Gráficos não aparecem:**
- Confirme que o Chart.js está carregando (verifique em F12 > Network)
- Verifique se há dados válidos no CSV

**Filtros não funcionam:**
- Recarregue a página (Ctrl+F5)
- Confirme que há dados para o filtro selecionado

## 📞 Suporte

Para mais informações ou problemas, verifique:
1. O console do navegador (F12)
2. A validação do CSV
3. A compatibilidade do navegador

## 📄 Licença

Este projeto é fornecido como está para uso educacional e comercial.

---

**Desenvolvido com ❤️ para gestão eficiente de despesas de viagem**