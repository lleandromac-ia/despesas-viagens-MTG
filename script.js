Chart.register(ChartDataLabels);

const PAGE_SIZE = 20;
const SUPABASE_BATCH_SIZE = 1000;
const CORES_MODALIDADE = {
    'NUMERÁRIO': '#1976d2',
    'AGÊNCIA DE VIAGENS': '#7b1fa2',
    'CARTÃO CORPORATIVO': '#388e3c'
};
const CORES_BARRAS = [
    'rgba(27, 61, 27, 0.85)',
    'rgba(45, 80, 22, 0.8)',
    'rgba(76, 175, 80, 0.75)',
    'rgba(139, 195, 74, 0.75)',
    'rgba(255, 152, 0, 0.75)',
    'rgba(244, 67, 54, 0.75)',
    'rgba(33, 150, 243, 0.75)',
    'rgba(156, 39, 176, 0.75)',
    'rgba(0, 188, 212, 0.75)',
    'rgba(233, 30, 99, 0.75)',
    'rgba(63, 81, 181, 0.75)',
    'rgba(255, 193, 7, 0.75)',
    'rgba(121, 85, 72, 0.75)',
    'rgba(96, 125, 139, 0.75)',
    'rgba(0, 150, 136, 0.75)'
];

let dados = [];
let dadosFiltrados = [];
let dadosTabela = [];
let paginaAtual = 1;
let modalidadeMode = 'quantidade';
let periodoInicio = null;
let periodoFim = null;
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
    inicializarEventos();
    await carregarDados();
});

function inicializarEventos() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            mudarPagina(item.dataset.page);
        });
    });

    document.getElementById('btn-collapse-sidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });

    document.getElementById('btn-toggle-filters').addEventListener('click', () => {
        document.getElementById('filters-panel').classList.toggle('open');
    });

    ['filter-categoria', 'filter-departamento', 'filter-funcionario', 'filter-modalidade'].forEach(id => {
        document.getElementById(id).addEventListener('change', aplicarFiltros);
    });

    document.getElementById('btn-aplicar-periodo').addEventListener('click', aplicarPeriodo);
    document.getElementById('btn-limpar-periodo').addEventListener('click', limparPeriodo);
    document.getElementById('btn-reset-filtros').addEventListener('click', limparFiltros);
    document.getElementById('search-global').addEventListener('input', aplicarFiltros);
    document.getElementById('btn-reload').addEventListener('click', carregarDados);

    document.getElementById('btn-modal-quantidade').addEventListener('click', () => setModalidadeMode('quantidade'));
    document.getElementById('btn-modal-valor').addEventListener('click', () => setModalidadeMode('valor'));

    document.getElementById('search-lancamentos').addEventListener('input', filtrarTabela);
    document.getElementById('btn-export').addEventListener('click', exportarXlsx);
    document.getElementById('btn-prev').addEventListener('click', () => mudarPaginaTabela(-1));
    document.getElementById('btn-next').addEventListener('click', () => mudarPaginaTabela(1));
}

async function carregarDados() {
    const badge = document.getElementById('loading-badge');
    badge.classList.remove('hidden');
    badge.textContent = 'Carregando...';

    try {
        if (!validarSupabaseConfig()) {
            throw new Error('Configure supabase-config.js com URL, chave e tabela.');
        }

        const registros = await buscarTodosRegistros(badge);
        dados = registros.map(normalizarRegistro);
        dadosFiltrados = [...dados];
        dadosTabela = [...dados];

        console.log(`${dados.length} registros carregados do Supabase`);
        preencherFiltros();
        definirPeriodoPadrao();
        aplicarFiltros();
    } catch (erro) {
        console.error(erro);
        alert(`Erro ao carregar dados: ${erro.message}`);
    } finally {
        badge.classList.add('hidden');
        badge.textContent = 'Carregando...';
    }
}

async function buscarTodosRegistros(badge) {
    const todos = [];
    let offset = 0;
    let total = null;

    while (true) {
        const fim = offset + SUPABASE_BATCH_SIZE - 1;
        const headers = {
            ...getSupabaseHeaders(),
            Range: `${offset}-${fim}`,
            Prefer: 'count=exact'
        };

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=*&order=id.asc`,
            { headers }
        );

        if (!response.ok) {
            const erro = await response.text();
            throw new Error(`HTTP ${response.status}: ${erro || response.statusText}`);
        }

        const lote = await response.json();
        if (!Array.isArray(lote)) {
            throw new Error('Resposta inesperada do Supabase.');
        }

        todos.push(...lote);

        const contentRange = response.headers.get('Content-Range');
        if (contentRange) {
            const parteTotal = contentRange.split('/')[1];
            if (parteTotal && parteTotal !== '*') {
                total = parseInt(parteTotal, 10);
            }
        }

        if (badge) {
            badge.textContent = total
                ? `Carregando... ${todos.length.toLocaleString('pt-BR')} / ${total.toLocaleString('pt-BR')}`
                : `Carregando... ${todos.length.toLocaleString('pt-BR')}`;
        }

        if (lote.length < SUPABASE_BATCH_SIZE) break;
        if (total !== null && todos.length >= total) break;

        offset += SUPABASE_BATCH_SIZE;
    }

    return todos;
}

function normalizarRegistro(r) {
    return {
        data: r.data ? String(r.data) : '',
        nome_funcionario: r.nome_funcionario || r.funcionario || '',
        departamento: r.departamento || '',
        modalidade: normalizarModalidade(r.modalidade || ''),
        categoria_despesa: r.categoria_despesa || r.categoria || '',
        descricao_despesa: r.descricao_despesa || r.descricao || '',
        valor: parseNumero(r.valor ?? r.valor_despesa)
    };
}

function normalizarModalidade(modal) {
    const m = (modal || '').toUpperCase().trim();
    if (m.includes('NUMER')) return 'NUMERÁRIO';
    if (m.includes('AGÊNCIA') || m.includes('AGENCIA')) return 'AGÊNCIA DE VIAGENS';
    if (m.includes('CARTÃO') || m.includes('CARTAO') || m.includes('CORPORATIVO')) return 'CARTÃO CORPORATIVO';
    return modal;
}

function parseNumero(valor) {
    if (valor === undefined || valor === null || valor === '') return 0;
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;

    let texto = String(valor).trim().replace(/\s/g, '');
    const virgula = texto.lastIndexOf(',');
    const ponto = texto.lastIndexOf('.');

    if (virgula > -1 && ponto > -1) {
        // Formato misto: o último separador indica as casas decimais
        texto = virgula > ponto
            ? texto.replace(/\./g, '').replace(',', '.')   // BR: 1.234,56
            : texto.replace(/,/g, '');                        // US: 1,234.56
    } else if (virgula > -1) {
        texto = texto.replace(',', '.');                     // BR: 82,76
    } else if (ponto > -1) {
        const depoisPonto = texto.slice(ponto + 1);
        if (depoisPonto.length === 3 && texto.indexOf('.') === ponto) {
            texto = texto.replace(/\./g, '');                // BR milhar: 1.122
        }
        // Caso contrário mantém o ponto como decimal (Supabase): 82.76, 1122.34
    }

    const n = parseFloat(texto);
    return Number.isNaN(n) ? 0 : n;
}

function parseData(valor) {
    if (!valor) return null;
    const texto = String(valor).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
        const d = new Date(texto + (texto.length === 10 ? 'T00:00:00' : ''));
        return Number.isNaN(d.getTime()) ? null : d;
    }

    const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return new Date(+br[3], +br[2] - 1, +br[1]);

    const d = new Date(texto);
    return Number.isNaN(d.getTime()) ? null : d;
}

function validarSupabaseConfig() {
    return (
        typeof SUPABASE_URL === 'string' && SUPABASE_URL.includes('supabase.co') &&
        typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 20 &&
        typeof SUPABASE_TABLE === 'string' && SUPABASE_TABLE.trim().length > 0
    );
}

function definirPeriodoPadrao() {
    if (!dados.length) return;
    const datas = dados.map(d => parseData(d.data)).filter(Boolean).sort((a, b) => a - b);
    if (!datas.length) return;
    periodoInicio = datas[0];
    periodoFim = datas[datas.length - 1];
    sincronizarInputsPeriodo();
}

function sincronizarInputsPeriodo() {
    document.getElementById('filter-date-start').value = periodoInicio
        ? periodoInicio.toISOString().split('T')[0] : '';
    document.getElementById('filter-date-end').value = periodoFim
        ? periodoFim.toISOString().split('T')[0] : '';
}

function aplicarPeriodo() {
    const start = document.getElementById('filter-date-start').value;
    const end = document.getElementById('filter-date-end').value;
    periodoInicio = start ? new Date(start + 'T00:00:00') : null;
    periodoFim = end ? new Date(end + 'T23:59:59') : null;
    aplicarFiltros();
}

function limparPeriodo() {
    definirPeriodoPadrao();
    aplicarFiltros();
}

function preencherFiltros() {
    const categorias = [...new Set(dados.map(d => d.categoria_despesa).filter(Boolean))].sort();
    const departamentos = [...new Set(dados.map(d => d.departamento).filter(Boolean))].sort();
    const funcionarios = [...new Set(dados.map(d => d.nome_funcionario).filter(Boolean))].sort();

    preencherSelect('filter-categoria', categorias);
    preencherSelect('filter-departamento', departamentos);
    preencherSelect('filter-funcionario', funcionarios);
}

function preencherSelect(id, opcoes) {
    const select = document.getElementById(id);
    const atual = select.value;
    const primeira = select.options[0];
    select.innerHTML = '';
    select.appendChild(primeira);
    opcoes.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = op;
        select.appendChild(opt);
    });
    if ([...select.options].some(o => o.value === atual)) select.value = atual;
}

function aplicarFiltros() {
    const categoria = document.getElementById('filter-categoria').value;
    const departamento = document.getElementById('filter-departamento').value;
    const funcionario = document.getElementById('filter-funcionario').value;
    const modalidade = document.getElementById('filter-modalidade').value;
    const busca = document.getElementById('search-global').value.trim().toLowerCase();

    dadosFiltrados = dados.filter(d => {
        if (categoria && d.categoria_despesa !== categoria) return false;
        if (departamento && d.departamento !== departamento) return false;
        if (funcionario && d.nome_funcionario !== funcionario) return false;
        if (modalidade && d.modalidade !== modalidade) return false;

        if (busca) {
            const texto = `${d.nome_funcionario} ${d.departamento} ${d.categoria_despesa} ${d.descricao_despesa}`.toLowerCase();
            if (!texto.includes(busca)) return false;
        }

        if (periodoInicio || periodoFim) {
            const data = parseData(d.data);
            if (!data) return false;
            if (periodoInicio && data < periodoInicio) return false;
            if (periodoFim && data > periodoFim) return false;
        }

        return true;
    });

    dadosTabela = [...dadosFiltrados];
    paginaAtual = 1;
    atualizarChipsFiltros();
    atualizarDashboard();
    atualizarTabela();
}

function limparFiltros() {
    document.getElementById('filter-categoria').value = '';
    document.getElementById('filter-departamento').value = '';
    document.getElementById('filter-funcionario').value = '';
    document.getElementById('filter-modalidade').value = '';
    document.getElementById('search-global').value = '';
    definirPeriodoPadrao();
    aplicarFiltros();
}

function atualizarChipsFiltros() {
    const container = document.getElementById('active-filters');
    const chips = [];

    const add = (label, clearFn) => {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.innerHTML = `${label} <button type="button" aria-label="Remover filtro">×</button>`;
        chip.querySelector('button').addEventListener('click', clearFn);
        chips.push(chip);
    };

    const cat = document.getElementById('filter-categoria').value;
    const dep = document.getElementById('filter-departamento').value;
    const func = document.getElementById('filter-funcionario').value;
    const mod = document.getElementById('filter-modalidade').value;

    if (cat) add(`Categoria: ${cat}`, () => { document.getElementById('filter-categoria').value = ''; aplicarFiltros(); });
    if (dep) add(`Departamento: ${dep}`, () => { document.getElementById('filter-departamento').value = ''; aplicarFiltros(); });
    if (func) add(`Funcionário: ${func}`, () => { document.getElementById('filter-funcionario').value = ''; aplicarFiltros(); });
    if (mod) add(`Modalidade: ${mod}`, () => { document.getElementById('filter-modalidade').value = ''; aplicarFiltros(); });

    container.innerHTML = '';
    chips.forEach(c => container.appendChild(c));
    container.classList.toggle('hidden', chips.length === 0);
}

function toggleFiltroSelect(id, valor) {
    const select = document.getElementById(id);
    select.value = select.value === valor ? '' : valor;
    aplicarFiltros();
}

function atualizarDashboard() {
    atualizarKpis();
    atualizarGraficoModalidade();
    atualizarGraficoBarras('categorias', 'categoria_despesa', 'chart-categorias', 10, 'filter-categoria');
    atualizarGraficoBarras('departamentos', 'departamento', 'chart-departamentos', 10, 'filter-departamento');
    atualizarGraficoBarras('funcionarios', 'nome_funcionario', 'chart-funcionarios', 15, 'filter-funcionario');
    atualizarGraficoMensal();
}

function atualizarKpis() {
    const total = dadosFiltrados.reduce((s, d) => s + d.valor, 0);
    const qtd = dadosFiltrados.length;
    const ticket = qtd > 0 ? total / qtd : 0;

    document.getElementById('total-despesas').textContent = formatarMoeda(total);
    document.getElementById('total-lancamentos').textContent = qtd.toLocaleString('pt-BR');
    document.getElementById('ticket-medio').textContent = formatarMoeda(ticket);

    const mods = { 'CARTÃO CORPORATIVO': 0, 'NUMERÁRIO': 0, 'AGÊNCIA DE VIAGENS': 0 };
    dadosFiltrados.forEach(d => {
        if (mods[d.modalidade] !== undefined) {
            mods[d.modalidade] += modalidadeMode === 'valor' ? d.valor : 1;
        }
    });

    const fmt = v => modalidadeMode === 'valor' ? formatarMoeda(v) : v.toLocaleString('pt-BR');
    document.getElementById('modal-cartao').textContent = fmt(mods['CARTÃO CORPORATIVO']);
    document.getElementById('modal-numerario').textContent = fmt(mods['NUMERÁRIO']);
    document.getElementById('modal-agencia').textContent = fmt(mods['AGÊNCIA DE VIAGENS']);
}

function setModalidadeMode(mode) {
    modalidadeMode = mode;
    document.getElementById('btn-modal-quantidade').classList.toggle('active', mode === 'quantidade');
    document.getElementById('btn-modal-valor').classList.toggle('active', mode === 'valor');
    atualizarKpis();
}

function agruparPor(campo) {
    const mapa = {};
    dadosFiltrados.forEach(d => {
        const chave = d[campo] || 'Outros';
        mapa[chave] = (mapa[chave] || 0) + d.valor;
    });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
}

function atualizarGraficoModalidade() {
    const mapa = { 'NUMERÁRIO': 0, 'AGÊNCIA DE VIAGENS': 0, 'CARTÃO CORPORATIVO': 0 };
    dadosFiltrados.forEach(d => {
        if (mapa[d.modalidade] !== undefined) mapa[d.modalidade] += d.valor;
    });

    const labels = Object.keys(mapa);
    const valores = Object.values(mapa);
    const cores = labels.map(l => CORES_MODALIDADE[l] || '#94a3b8');
    const total = valores.reduce((s, v) => s + v, 0);

    destruirChart('modalidades');
    const ctx = document.getElementById('chart-modalidades').getContext('2d');
    charts.modalidades = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: valores, backgroundColor: cores, borderWidth: 2, borderColor: '#fff' }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '42%',
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 13 },
                    formatter: (v) => total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '',
                    display: ctx => ctx.dataset.data[ctx.dataIndex] > 0
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${formatarMoeda(ctx.raw)} (${total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0}%)`
                    }
                }
            },
            onClick: (_, elements) => {
                if (!elements.length) return;
                toggleFiltroSelect('filter-modalidade', labels[elements[0].index]);
            }
        }
    });

    atualizarLegendaModalidade(labels, cores, valores, total);
}

function atualizarLegendaModalidade(labels, cores, valores, total) {
    const el = document.getElementById('legend-modalidades');
    el.innerHTML = labels.map((l, i) => {
        const pct = total > 0 ? ((valores[i] / total) * 100).toFixed(1) : 0;
        return `<div class="legend-item"><span class="legend-dot" style="background:${cores[i]}"></span>${l} — ${formatarMoeda(valores[i])} (${pct}%)</div>`;
    }).join('');
}

function atualizarGraficoBarras(chave, campo, canvasId, limite, filtroId) {
    const agrupado = agruparPor(campo).slice(0, limite);
    const labels = agrupado.map(([k]) => k);
    const valores = agrupado.map(([, v]) => v);
    const cores = labels.map((_, i) => CORES_BARRAS[i % CORES_BARRAS.length]);

    destruirChart(chave);
    const canvas = document.getElementById(canvasId);
    const altura = Math.max(260, labels.length * 28);
    canvas.parentElement.style.height = altura + 'px';

    charts[chave] = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: valores,
                backgroundColor: cores,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: { display: false },
                tooltip: {
                    callbacks: { label: ctx => formatarMoeda(ctx.raw) }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: v => 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                }
            },
            onClick: (_, elements) => {
                if (!elements.length) return;
                toggleFiltroSelect(filtroId, labels[elements[0].index]);
            }
        }
    });
}

function atualizarGraficoMensal() {
    const meses = {};
    dadosFiltrados.forEach(d => {
        const data = parseData(d.data);
        if (!data) return;
        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        meses[chave] = (meses[chave] || 0) + d.valor;
    });

    const chaves = Object.keys(meses).sort();
    const labels = chaves.map(k => {
        const [ano, mes] = k.split('-');
        const nome = new Date(+ano, +mes - 1).toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
        return nome.charAt(0).toUpperCase() + nome.slice(1);
    });
    const valores = chaves.map(k => meses[k]);

    destruirChart('mensal');
    charts.mensal = new Chart(document.getElementById('chart-mensal').getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Despesas',
                data: valores,
                borderColor: '#1b3d1b',
                backgroundColor: 'rgba(76, 175, 80, 0.15)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointRadius: 5,
                pointBackgroundColor: '#1b3d1b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: { display: false },
                tooltip: {
                    callbacks: { label: ctx => formatarMoeda(ctx.raw) }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: v => 'R$ ' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: { grid: { display: false } }
            },
            onClick: (_, elements) => {
                if (!elements.length) return;
                const idx = elements[0].index;
                const [ano, mes] = chaves[idx].split('-');
                periodoInicio = new Date(+ano, +mes - 1, 1);
                periodoFim = new Date(+ano, +mes, 0, 23, 59, 59);
                sincronizarInputsPeriodo();
                aplicarFiltros();
            }
        }
    });
}

function destruirChart(nome) {
    if (charts[nome]) {
        charts[nome].destroy();
        charts[nome] = null;
    }
}

function atualizarTabela() {
    const inicio = (paginaAtual - 1) * PAGE_SIZE;
    const pagina = dadosTabela.slice(inicio, inicio + PAGE_SIZE);
    const tbody = document.getElementById('table-body');

    if (!pagina.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:#64748b">Nenhum lançamento encontrado</td></tr>';
    } else {
        tbody.innerHTML = pagina.map(r => {
            const data = parseData(r.data);
            const dataFmt = data ? data.toLocaleDateString('pt-BR') : r.data;
            const badge = badgeModalidade(r.modalidade);
            return `<tr>
                <td>${dataFmt}</td>
                <td>${esc(r.nome_funcionario)}</td>
                <td>${esc(r.departamento)}</td>
                <td>${badge}</td>
                <td>${esc(r.categoria_despesa)}</td>
                <td>${esc(r.descricao_despesa)}</td>
                <td class="valor-cell">${formatarMoeda(r.valor)}</td>
            </tr>`;
        }).join('');
    }

    const totalPaginas = Math.max(1, Math.ceil(dadosTabela.length / PAGE_SIZE));
    document.getElementById('pagination-info').textContent =
        `Página ${paginaAtual} de ${totalPaginas} (${dadosTabela.length} registros)`;
    document.getElementById('btn-prev').disabled = paginaAtual <= 1;
    document.getElementById('btn-next').disabled = paginaAtual >= totalPaginas;
}

function badgeModalidade(mod) {
    let cls = 'badge-numerario';
    if (mod === 'AGÊNCIA DE VIAGENS') cls = 'badge-agencia';
    else if (mod === 'CARTÃO CORPORATIVO') cls = 'badge-cartao';
    return `<span class="badge ${cls}">${esc(mod)}</span>`;
}

function filtrarTabela() {
    const busca = document.getElementById('search-lancamentos').value.toLowerCase();
    dadosTabela = dadosFiltrados.filter(d => {
        const texto = `${d.data} ${d.nome_funcionario} ${d.departamento} ${d.modalidade} ${d.categoria_despesa} ${d.descricao_despesa} ${d.valor}`.toLowerCase();
        return texto.includes(busca);
    });
    paginaAtual = 1;
    atualizarTabela();
}

function mudarPaginaTabela(delta) {
    const total = Math.ceil(dadosTabela.length / PAGE_SIZE);
    paginaAtual = Math.min(Math.max(1, paginaAtual + delta), total);
    atualizarTabela();
    document.querySelector('.table-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function mudarPagina(pagina) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === pagina));
    document.getElementById('page-dashboard').classList.toggle('active', pagina === 'dashboard');
    document.getElementById('page-lancamentos').classList.toggle('active', pagina === 'lancamentos');
    if (pagina === 'lancamentos') atualizarTabela();
}

function exportarXlsx() {
    const rows = dadosTabela.map(d => {
        const data = parseData(d.data);
        return {
            Data: data ? data.toLocaleDateString('pt-BR') : d.data,
            Funcionário: d.nome_funcionario,
            Departamento: d.departamento,
            Modalidade: d.modalidade,
            Categoria: d.categoria_despesa,
            Descrição: d.descricao_despesa,
            Valor: d.valor
        };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos');
    XLSX.writeFile(wb, `despesas_viagem_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function formatarMoeda(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}
