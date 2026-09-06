🗺️ Roteiro Geral Preliminar (Visão do Produto)
1. Identidade e UX (Experiência do Usuário)

Estilo: App FinTech Premium (inspirado em Nubank, Apple Wallet, Revolut).

Tema: Light/Dark Mode automático baseado no sistema do usuário.

Navegação: Sem menus complexos. Apenas deslizar lateralmente para trocar de mês.

Adição de Gasto: Sai o formulário fixo na tela. Entra um Botão Flutuante (FAB) com um "+" que abre uma aba de baixo para cima (Bottom Sheet), super elegante.

Ações Rápidas: Swipe to delete (deslizar o item da lista para a esquerda para apagar).

2. Funcionalidades Core (O Motor do App)

Gestão de Saldo: Entrada de renda mensal e cálculo automático de Saldo Livre.

Tipos de Gastos:

Único: Gasto comum do dia a dia.

Fixo/Recorrente: Lançamentos que se repetem (ex: Faculdade, Netflix) e são projetados para os meses seguintes.

Parcelado: Lançamentos divididos (ex: 1/12, 2/12) que preenchem os meses futuros automaticamente.

Categorias Inteligentes: Lista padrão com emojis (🍔 Alimentação, 🚗 Transporte, etc.) + opção de Criar Categoria Personalizada na hora.

Histórico e Busca: Lista dos gastos do mês com barra de pesquisa minimalista em tempo real.

3. Inteligência e Gamificação (Diferenciais)

Dashboard Visual: Gráfico de rosca (Donut Chart) minimalista detalhando onde o dinheiro está indo.

AI Tips (Alertas): Mensagens contextuais baseadas em regras lógicas (ex: aviso se gastar muito com Lazer/Cigarro; parabéns se poupar mais de 20%).

4. Infraestrutura e Dados

PWA: Instalável no celular, com ícone e tela cheia (offline-first com Service Worker).

Armazenamento Inicial: LocalStorage (salvo no navegador do usuário), arquitetado com módulos (appData["YYYY-MM"]) para facilitar a migração futura para Banco de Dados (Supabase/Vercel).

Exportação: Botão para baixar relatório em .csv.

## 🎯 Visão Geral
Aplicativo de controle financeiro PWA, focado em uso diário mobile (Mobile-First). Possui uma interface premium, minimalista e monocromática, inspirada em aplicativos como Apple Wallet. Projetado com arquitetura "API-Ready" para fácil migração futura para nuvem (Vercel + Supabase).

## 🎨 UI/UX (Design System)
*   **Tema:** Monocromático de Alto Contraste.
*   **Light Mode:** Fundo branco (`#ffffff`), cartões e inputs em cinza ultraclaro (`#f9f9f9`), texto preto puro (`#000000`).
*   **Dark Mode (Automático):** Fundo quase preto (`#121212`), cartões cinza escuro (`#1e1e1e`), texto cinza claro/branco (`#e0e0e0`).
*   **Navegação:** Sem menus hambúrguer. Navegação temporal por gestos (deslizar para os lados troca o mês).
*   **Interações Nativas:** 
    *   Botão flutuante (FAB) de "+" que aciona um *Bottom Sheet* (modal que sobe da base) para o formulário.
    *   *Swipe-to-delete* (deslizar para a esquerda) na lista de gastos para apagar.

## ⚙️ Arquitetura de Software (API-Ready)
O JavaScript Vanilla utilizará o padrão de **Camada de Serviço (Service Layer)**. 
Haverá um objeto `Database` que gerenciará os dados. Todo o restante do App fará requisições assíncronas (`async/await`) para este objeto.
*   *Fase 1 (Atual):* O objeto `Database` simula uma API, mas salva/lê do `localStorage`.
*   *Fase 2 (Futuro):* O objeto `Database` fará requisições reais (`fetch` ou Supabase SDK). O resto da UI não precisará ser alterado.

## 🚀 Funcionalidades Core
1.  **Gestão de Saldo:** Um único input global por mês para definir a Renda.
2.  **Motor de Gastos (Bottom Sheet):**
    *   **Único:** Gasto pontual.
    *   **Parcelado:** Usuário insere "Valor Total" e "Parcelas". O sistema divide e injeta o gasto no mês atual e nos N meses seguintes com sufixo (ex: *1/12*).
    *   **Fixo:** Gasto recorrente. O sistema projeta esse gasto automaticamente para os próximos 12 meses.
3.  **Categorias Inteligentes:** Select com categorias base (com emojis). Última opção permite criar uma nova categoria (salva no banco).
4.  **Máscara em Tempo Real:** Formatação rigorosa de BRL (R$ 0,00) ao digitar.

## 📈 Visualização e Inteligência
1.  **Gráficos Duplos (Chart.js):**
    *   *Donut Chart (Rosca):* Distribuição de gastos por categoria.
    *   *Bar Chart (Barras):* Histórico linear de gastos ao longo dos dias do mês (fluxo de caixa).
2.  **Pesquisa Instantânea:** Barra de pesquisa sutil acima do histórico para filtrar itens digitando.
3.  **Alertas (IA Baseada em Regras):** Dicas no painel se gastos com lazer/cigarro passarem de certos % ou se houver grande margem de economia.

## 📱 PWA
*   `manifest.json` e `sw.js` (Service Worker) para instalação e funcionamento offline básico.