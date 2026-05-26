// Global Variables
let dados = [];
let dadosFiltrados = [];
let dadosFiltradosLancamentos = [];
let paginaAtual = 1;
const linhasPorPagina = 20;
let charts = {
    categorias: null,
    linhas: null,
    departamentos: null,
    modalidades: null,
    mensal: null,
    funcionarios: null
};
let modalidadeMode = 'quantidade';
let mensalStart = null;
let mensalEnd = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    inicializarEventos();
    await carregarDados();
    
    if (dados.length === 0) {
        console.warn('Nenhum dado foi carregado');
        document.getElementById('total-despesas').textContent = 'R$ 0,00';
        document.getElementById('total-lancamentos').textContent = '0';
        document.getElementById('ticket-medio').textContent = 'R$ 0,00';
    } else {
        atualizarDashboard();
    }
});

// Carregar dados do CSV
async function carregarDados() {
    try {
        const response = await fetch('dados.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const texto = decodeTextBuffer(buffer);
        dados = parseCSV(texto);
        dadosFiltrados = [...dados];
        dadosFiltradosLancamentos = [...dados];
        console.log(`${dados.length} registros carregados com sucesso`);
        
        if (dados.length === 0) {
            alert('Nenhum dado foi carregado. Verifique o arquivo dados.csv');
        } else {
            preencherFiltros();
            calcularDatasMensal();
        }
    } catch (erro) {
        console.error('Erro ao carregar dados:', erro);
        const mensagem = `Erro ao carregar dados do CSV:\n${erro.message}\n\n` +
            `Se você estiver abrindo o arquivo localmente, pode ser necessário iniciar um servidor local ou selecionar o arquivo manualmente.`;
        alert(mensagem);
        abrirSelecionadorCSV();
    }
}

function abrirSelecionadorCSV() {
    const inputCsv = document.getElementById('input-csv');
    if (inputCsv) {
        try {
            inputCsv.click();
        } catch (erro) {
            console.warn('Não foi possível abrir automaticamente o seletor de arquivo.', erro);
        }
    }
}

function lerArquivoCSV(arquivo) {
    const leitor = new FileReader();
    leitor.onload = (evento) => {
        const buffer = evento.target.result;
        const texto = decodeTextBuffer(buffer);
        dados = parseCSV(texto);
        dadosFiltrados = [...dados];
        dadosFiltradosLancamentos = [...dados];
        
        if (dados.length === 0) {
            alert('O arquivo CSV selecionado está vazio ou inválido. Verifique o formato.');
            return;
        }

        preencherFiltros();
        calcularDatasMensal();
        atualizarDashboard();
        atualizarTabela();
        alert(`Arquivo ${arquivo.name} carregado com sucesso (${dados.length} registros).`);
    };

    leitor.onerror = () => {
        alert('Erro ao ler o arquivo CSV. Verifique o arquivo e tente novamente.');
    };

    leitor.readAsArrayBuffer(arquivo);
}

function calcularDatasMensal() {
    if (dados.length === 0) return;
    const datas = dados.map(d => parseDataBR(d.data)).filter(d => d).sort((a, b) => a - b);
    if (datas.length > 0) {
        mensalStart = datas[0];
        mensalEnd = datas[datas.length - 1];
        atualizarInputsPeriodo();
    }
}

function atualizarInputsPeriodo() {
    const startValue = mensalStart ? mensalStart.toISOString().split('T')[0] : '';
    const endValue = mensalEnd ? mensalEnd.toISOString().split('T')[0] : '';

    ['date-range-start', 'sidebar-date-start'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = startValue;
    });
    ['date-range-end', 'sidebar-date-end'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = endValue;
    });
}

function atualizarPeriodoPorIds(startInputId, endInputId) {
    const start = document.getElementById(startInputId).value;
    const end = document.getElementById(endInputId).value;

    mensalStart = start ? new Date(start + 'T00:00:00') : null;
    mensalEnd = end ? new Date(end + 'T23:59:59') : null;
    atualizarInputsPeriodo();
    aplicarFiltros();
}

function decodeTextBuffer(buffer) {
    const utf8 = new TextDecoder('utf-8').decode(buffer);
    if (utf8.includes('�')) {
        try {
            const cp1252 = new TextDecoder('windows-1252').decode(buffer);
            if (!cp1252.includes('�')) {
                return cp1252;
            }
        } catch (erro) {
            console.warn('Falha ao decodificar como windows-1252', erro);
        }
    }
    return utf8;
}

// Parser do CSV - Versão melhorada
function parseCSV(texto) {
    const linhas = texto.trim().split(/\r?\n/);
    if (linhas.length < 2) {
        console.warn('CSV vazio ou inválido');
        return [];
    }

    const delimitador = detectarDelimitador(linhas[0]);
    const cabecalhos = parseCSVLine(linhas[0], delimitador);
    const dados = [];

    for (let i = 1; i < linhas.length; i++) {
        if (linhas[i].trim() === '') continue;
        
        try {
            const valores = parseCSVLine(linhas[i], delimitador);
            const objeto = {};
            
            cabecalhos.forEach((cabecalho, index) => {
                objeto[cabecalho] = valores[index] || '';
            });

            // Normalize modalidade
            if (objeto.modalidade) objeto.modalidade = normalizeModalidade(objeto.modalidade);
            
            dados.push(objeto);
        } catch (erro) {
            console.warn(`Erro ao processar linha ${i + 1}:`, erro);
        }
    }

    return dados;
}

function detectarDelimitador(linha) {
    const countComma = (linha.match(/,/g) || []).length;
    const countSemicolon = (linha.match(/;/g) || []).length;
    return countSemicolon > countComma ? ';' : ',';
}

// Função para fazer parse de uma linha CSV respeitando campos entre aspas
function parseCSVLine(linha, delimitador = ',') {
    const resultado = [];
    let campo = '';
    let dentro_aspas = false;

    for (let i = 0; i < linha.length; i++) {
        const caractere = linha[i];

        if (caractere === '"') {
            dentro_aspas = !dentro_aspas;
        } else if (caractere === delimitador && !dentro_aspas) {
            resultado.push(campo.trim());
            campo = '';
        } else {
            campo += caractere;
        }
    }

    // Adicionar último campo
    resultado.push(campo.trim());

    return resultado;
}

function normalizeModalidade(modal) {
    if (!modal) return '';
    const m = modal.toUpperCase().trim();
    if (m.includes('NUMERÁRIO') || m.includes('NUMERARIO')) return 'NUMERÁRIO';
    if (m.includes('AGÊNCIA') || m.includes('AGENCIA')) return 'AGÊNCIA DE VIAGENS';
    if (m.includes('CARTÃO') || m.includes('CARTAO') || m.includes('CORPORATIVO')) return 'CARTÃO CORPORATIVO';
    return modal;
}

function parseNumero(valor) {
    if (valor === undefined || valor === null || valor === '') {
        return 0;
    }

    const texto = String(valor).trim().replace(/\./g, '').replace(',', '.');
    const numero = parseFloat(texto);
    return Number.isNaN(numero) ? 0 : numero;
}

function parseDataBR(valor) {
    if (!valor) {
        return null;
    }

    const partes = valor.split('/').map(p => p.trim());
    if (partes.length !== 3) {
        return null;
    }

    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const ano = parseInt(partes[2], 10);

    const data = new Date(ano, mes, dia);
    return Number.isNaN(data.getTime()) ? null : data;
}

function parseMesPtBr(label) {
    if (!label) return null;
    const meses = {
        jan: 0,
        fev: 1,
        mar: 2,
        abr: 3,
        mai: 4,
        jun: 5,
        jul: 6,
        ago: 7,
        set: 8,
        out: 9,
        nov: 10,
        dez: 11
    };
    const partes = label.toLowerCase().replace('.', '').split(/\s+/);
    if (partes.length < 2) return null;
    const mes = meses[partes[0]];
    const ano = parseInt(partes[1].replace('.', ''), 10);
    if (mes === undefined || !Number.isFinite(ano)) return null;
    return { mes, ano };
}

// Inicializar eventos
function inicializarEventos() {
    // Menu Navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pagina = item.getAttribute('data-page');
            mudaPagina(pagina);
        });
    });

    // Filtros
    document.getElementById('filter-categoria').addEventListener('change', aplicarFiltros);
    document.getElementById('filter-departamento').addEventListener('change', aplicarFiltros);
    document.getElementById('filter-funcionario').addEventListener('change', aplicarFiltros);
    document.getElementById('filter-modalidade').addEventListener('change', aplicarFiltros);
    document.getElementById('btn-reset-filtros').addEventListener('click', limparFiltros);

    // Modalidade mode
    document.getElementById('btn-modal-quantidade').addEventListener('click', () => setModalidadeMode('quantidade'));
    document.getElementById('btn-modal-valor').addEventListener('click', () => setModalidadeMode('valor'));

    // Upload de CSV
    document.getElementById('btn-carregar-csv').addEventListener('click', () => {
        document.getElementById('input-csv').click();
    });
    document.getElementById('input-csv').addEventListener('change', (event) => {
        const arquivo = event.target.files[0];
        if (arquivo) {
            lerArquivoCSV(arquivo);
        }
    });

    // Lançamentos
    document.getElementById('search-lancamentos').addEventListener('input', filtrarTabela);
    document.querySelector('.search-input').addEventListener('input', aplicarFiltros);
    document.getElementById('btn-export-csv').addEventListener('click', exportarCSV);
    document.getElementById('btn-prev-page').addEventListener('click', paginaAnterior);
    document.getElementById('btn-next-page').addEventListener('click', proximaPagina);
    document.getElementById('btn-filtrar-mensal').addEventListener('click', () => atualizarPeriodoPorIds('date-range-start', 'date-range-end'));
    document.getElementById('btn-limpar-periodo').addEventListener('click', limparPeriodo);
    document.getElementById('btn-aplicar-periodo')?.addEventListener('click', () => atualizarPeriodoPorIds('sidebar-date-start', 'sidebar-date-end'));
    document.getElementById('btn-limpar-periodo-sidebar')?.addEventListener('click', limparPeriodo);

    // Modal
    document.querySelector('.modal-close').addEventListener('click', fecharModal);
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal-detalhes');
        if (e.target === modal) {
            fecharModal();
        }
    });

    // Preencher filtros
    preencherFiltros();

    // Interação do gráfico de categorias
    const chartCategoriasCanvas = document.getElementById('chart-categorias');
    chartCategoriasCanvas.addEventListener('click', (event) => {
        if (!charts.categorias) return;
        const points = charts.categorias.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if (!points.length) return;
        const index = points[0].index;
        const categoria = charts.categorias.data.labels[index];
        if (!categoria) return;
        const selectCategoria = document.getElementById('filter-categoria');
        selectCategoria.value = selectCategoria.value === categoria ? '' : categoria;
        aplicarFiltros();
    });
}

// Filtrar mensal
function filtrarMensal() {
    atualizarPeriodoPorIds('date-range-start', 'date-range-end');
}

// Limpar período selecionado
function limparPeriodo() {
    mensalStart = null;
    mensalEnd = null;
    calcularDatasMensal();
    aplicarFiltros();
}

// Preencher dropdowns de filtros
function preencherFiltros() {
    if (!dados || dados.length === 0) {
        console.warn('Sem dados para preencher filtros');
        return;
    }

    const categorias = [...new Set(dados.map(d => d.categoria_despesa).filter(Boolean))].sort();
    const departamentos = [...new Set(dados.map(d => d.departamento).filter(Boolean))].sort();
    const funcionarios = [...new Set(dados.map(d => d.nome_funcionario).filter(Boolean))].sort();

    preencherSelect('filter-categoria', categorias);
    preencherSelect('filter-departamento', departamentos);
    preencherSelect('filter-funcionario', funcionarios);
}

function preencherSelect(selectId, opcoes) {
    const select = document.getElementById(selectId);
    opcoes.forEach(opcao => {
        const option = document.createElement('option');
        option.value = opcao;
        option.textContent = opcao;
        select.appendChild(option);
    });
}

// Aplicar filtros
function aplicarFiltros() {
    const categoria = document.getElementById('filter-categoria').value;
    const departamento = document.getElementById('filter-departamento').value;
    const funcionario = document.getElementById('filter-funcionario').value;
    const modalidade = document.getElementById('filter-modalidade').value;
    const termoBusca = document.querySelector('.search-input').value.trim().toLowerCase();

    dadosFiltrados = dados.filter(d => {
        const matchCategoria = !categoria || d.categoria_despesa === categoria;
        const matchDepartamento = !departamento || d.departamento === departamento;
        const matchFuncionario = !funcionario || d.nome_funcionario === funcionario;
        const matchModalidade = !modalidade || d.modalidade === modalidade;

        const matchBusca = !termoBusca ||
            (d.nome_funcionario && d.nome_funcionario.toLowerCase().includes(termoBusca)) ||
            (d.departamento && d.departamento.toLowerCase().includes(termoBusca));

        // Incluir filtro de período
        let matchPeriodo = true;
        if (mensalStart || mensalEnd) {
            const data = parseDataBR(d.data);
            matchPeriodo = data && (!mensalStart || data >= mensalStart) && (!mensalEnd || data <= mensalEnd);
        }

        return matchCategoria && matchDepartamento && matchFuncionario && matchModalidade && matchBusca && matchPeriodo;
    });

    dadosFiltradosLancamentos = [...dadosFiltrados];
    paginaAtual = 1;
    atualizarDashboard();
    atualizarTabela();
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('filter-categoria').value = '';
    document.getElementById('filter-departamento').value = '';
    document.getElementById('filter-funcionario').value = '';
    document.getElementById('filter-modalidade').value = '';
    document.querySelector('.search-input').value = '';
    
    // Limpar também o período mensal
    mensalStart = null;
    mensalEnd = null;
    calcularDatasMensal();
    
    dadosFiltrados = [...dados];
    dadosFiltradosLancamentos = [...dados];
    paginaAtual = 1;
    atualizarDashboard();
    atualizarTabela();
}

// Atualizar Dashboard
function atualizarDashboard() {
    atualizarCards();
    atualizarGraficos();
}

// Atualizar Cards
function atualizarCards() {
    const totalDespesas = dadosFiltrados.reduce((sum, d) => sum + parseNumero(d.valor), 0);
    const totalLancamentos = dadosFiltrados.length;
    const ticketMedio = totalLancamentos > 0 ? totalDespesas / totalLancamentos : 0;

    // Contar por modalidade
    const modalidades = {};
    dadosFiltrados.forEach(d => {
        const chave = d.modalidade || 'OUTROS';
        if (!modalidades[chave]) modalidades[chave] = 0;
        if (modalidadeMode === 'valor') {
            modalidades[chave] += parseNumero(d.valor);
        } else {
            modalidades[chave] += 1;
        }
    });

    // Atualizar elementos
    document.getElementById('total-despesas').textContent = formatarMoeda(totalDespesas);
    document.getElementById('total-lancamentos').textContent = totalLancamentos.toLocaleString('pt-BR');
    document.getElementById('ticket-medio').textContent = formatarMoeda(ticketMedio);

    const cartao = modalidades['CARTÃO CORPORATIVO'] || modalidades['CARTÃO CORP.'] || 0;
    const numerario = modalidades['NUMERÁRIO'] || modalidades['NUMERARIO'] || 0;
    const agencia = modalidades['AGÊNCIA DE VIAGENS'] || modalidades['AGENCIA VIAGEM'] || modalidades['AGÊNCIA VIAGEM'] || 0;

    document.getElementById('modal-cartao').textContent = modalidadeMode === 'valor'
        ? formatarMoeda(cartao)
        : cartao.toLocaleString('pt-BR');
    document.getElementById('modal-numerario').textContent = modalidadeMode === 'valor'
        ? formatarMoeda(numerario)
        : numerario.toLocaleString('pt-BR');
    document.getElementById('modal-agencia').textContent = modalidadeMode === 'valor'
        ? formatarMoeda(agencia)
        : agencia.toLocaleString('pt-BR');

    const footerText = modalidadeMode === 'valor'
        ? 'Exibe soma de valores por modalidade'
        : 'Exibe quantidade de lançamentos por modalidade';
    document.getElementById('modalidade-footer').textContent = footerText;
}

function setModalidadeMode(mode) {
    modalidadeMode = mode;
    document.getElementById('btn-modal-quantidade').classList.toggle('active', mode === 'quantidade');
    document.getElementById('btn-modal-valor').classList.toggle('active', mode === 'valor');
    atualizarCards();
}

// Atualizar Gráficos
function atualizarGraficos() {
    atualizarGraficoCategoria();
    atualizarGraficoDepartamento();
    atualizarGraficoFuncionario();
    atualizarGraficoModalidade();
    atualizarGraficoMensal();
}

// Gráfico de Categorias (Barras Horizontais)
function atualizarGraficoCategoria() {
    const categorias = {};
    dadosFiltrados.forEach(d => {
        categorias[d.categoria_despesa] = (categorias[d.categoria_despesa] || 0) + parseNumero(d.valor);
    });

    const labels = Object.keys(categorias).sort((a, b) => categorias[b] - categorias[a]);
    const dados_valores = labels.map(l => categorias[l]);
    const cores = gerarCores(labels.length);

    const canvasCategorias = document.getElementById('chart-categorias');
    canvasCategorias.style.height = '320px';
    canvasCategorias.height = 320;
    const ctx = canvasCategorias.getContext('2d');
    
    if (charts.categorias) {
        charts.categorias.destroy();
    }

    charts.categorias = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Despesas (R$)',
                data: dados_valores,
                backgroundColor: cores,
                borderColor: cores.map(c => c.replace('0.7', '1')),
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                        }
                    }
                }
            }
        }
    });

    atualizarLegenda('legend-categorias', labels, cores);
}

// Gráfico de Linhas (Tendência por Mês)
function atualizarGraficoLinhas() {
    const meses = {};
    const mesesOrdenados = [];
    
    dadosFiltrados.forEach(d => {
        const data = parseDataBR(d.data);
        if (!data) return;
        const mesChave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        if (!meses[mesChave]) {
            meses[mesChave] = 0;
        }
        meses[mesChave] += parseNumero(d.valor);
    });

    const chavesOrdenadas = Object.keys(meses).sort();
    const valores = chavesOrdenadas.map(k => meses[k]);

    // Formatar labels de mês
    const labels = chavesOrdenadas.map(k => {
        const [ano, mes] = k.split('-');
        const nomeMes = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
        return nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    });

    const ctx = document.getElementById('chart-linhas').getContext('2d');
    
    if (charts.linhas) {
        charts.linhas.destroy();
    }

    charts.linhas = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Despesas (R$)',
                data: valores,
                borderColor: '#2d5016',
                backgroundColor: 'rgba(45, 80, 22, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#2d5016',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                        }
                    }
                }
            }
        }
    });

    atualizarLegenda('legend-linhas', ['Despesas'], ['#2d5016']);
}

// Gráfico de Departamentos
function atualizarGraficoDepartamento() {
    const departamentos = {};
    dadosFiltrados.forEach(d => {
        const dep = d.departamento || 'OUTROS';
        departamentos[dep] = (departamentos[dep] || 0) + parseNumero(d.valor);
    });

    const labels = Object.keys(departamentos).sort((a, b) => departamentos[b] - departamentos[a]).slice(0, 10);
    const dados_valores = labels.map(l => departamentos[l]);
    const cores = gerarCores(labels.length);

    const canvasDepartamentos = document.getElementById('chart-departamentos');
    canvasDepartamentos.style.height = '320px';
    canvasDepartamentos.height = 320;
    const ctx = canvasDepartamentos.getContext('2d');
    
    if (charts.departamentos) {
        charts.departamentos.destroy();
    }

    charts.departamentos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Despesas (R$)',
                data: dados_valores,
                backgroundColor: cores,
                borderColor: cores.map(c => c.replace('0.7', '1')),
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                        }
                    }
                }
            }
        }
    });

    const departamentoCanvas = document.getElementById('chart-departamentos');
    departamentoCanvas.onclick = (event) => {
        if (!charts.departamentos) return;
        const points = charts.departamentos.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if (!points.length) return;
        const index = points[0].index;
        const departamento = charts.departamentos.data.labels[index];
        if (!departamento) return;
        const selectDepartamento = document.getElementById('filter-departamento');
        selectDepartamento.value = selectDepartamento.value === departamento ? '' : departamento;
        aplicarFiltros();
    };

    atualizarLegenda('legend-departamentos', labels, cores);
}

// Gráfico de Funcionários
function atualizarGraficoFuncionario() {
    const funcionarios = {};
    dadosFiltrados.forEach(d => {
        const func = d.nome_funcionario || 'OUTROS';
        funcionarios[func] = (funcionarios[func] || 0) + parseNumero(d.valor);
    });

    const labels = Object.keys(funcionarios).sort((a, b) => funcionarios[b] - funcionarios[a]).slice(0, 10);
    const dados_valores = labels.map(l => funcionarios[l]);
    const cores = gerarCores(labels.length);

    const canvasFuncionarios = document.getElementById('chart-funcionarios');
    canvasFuncionarios.style.height = '320px';
    canvasFuncionarios.height = 320;
    const ctx = canvasFuncionarios.getContext('2d');
    
    if (charts.funcionarios) {
        charts.funcionarios.destroy();
    }

    charts.funcionarios = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Despesas (R$)',
                data: dados_valores,
                backgroundColor: cores,
                borderColor: cores.map(c => c.replace('0.7', '1')),
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                        }
                    }
                }
            }
        }
    });

    const funcionarioCanvas = document.getElementById('chart-funcionarios');
    funcionarioCanvas.onclick = (event) => {
        if (!charts.funcionarios) return;
        const points = charts.funcionarios.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if (!points.length) return;
        const index = points[0].index;
        const funcionario = charts.funcionarios.data.labels[index];
        if (!funcionario) return;
        const selectFuncionario = document.getElementById('filter-funcionario');
        selectFuncionario.value = selectFuncionario.value === funcionario ? '' : funcionario;
        aplicarFiltros();
    };

    atualizarLegenda('legend-funcionarios', labels, cores);
}

// Gráfico Linha Mensal
function atualizarGraficoMensal() {
    let dadosMensal = dadosFiltrados;
    if (mensalStart && mensalEnd) {
        dadosMensal = dadosFiltrados.filter(d => {
            const data = parseDataBR(d.data);
            return data && data >= mensalStart && data <= mensalEnd;
        });
    }

    const meses = {};
    dadosMensal.forEach(d => {
        const data = parseDataBR(d.data);
        if (!data) return;
        const mesChave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        meses[mesChave] = (meses[mesChave] || 0) + parseNumero(d.valor);
    });

    const chavesOrdenadas = Object.keys(meses).sort();
    const labels = chavesOrdenadas.map(k => {
        const [ano, mes] = k.split('-');
        return new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
    });
    const valores = chavesOrdenadas.map(k => meses[k]);
    const canvasMensal = document.getElementById('chart-mensal');
    canvasMensal.style.height = '320px';
    canvasMensal.height = 320;
    const ctx = canvasMensal.getContext('2d');

    if (charts.mensal) {
        charts.mensal.destroy();
    }

    charts.mensal = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Despesas por mês',
                data: valores,
                borderColor: '#2d5016',
                backgroundColor: 'rgba(45, 80, 22, 0.12)',
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointRadius: 5,
                pointBackgroundColor: '#2d5016'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => 'R$ ' + Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                    }
                }
            }
        }
    });

    const mensalCanvas = document.getElementById('chart-mensal');
    mensalCanvas.onclick = (event) => {
        if (!charts.mensal) return;
        const points = charts.mensal.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if (!points.length) return;
        const index = points[0].index;
        const label = charts.mensal.data.labels[index];
        const mesSelecionado = parseMesPtBr(label);
        if (!mesSelecionado) return;
        const start = new Date(mesSelecionado.ano, mesSelecionado.mes, 1);
        const end = new Date(mesSelecionado.ano, mesSelecionado.mes + 1, 0, 23, 59, 59);
        mensalStart = start;
        mensalEnd = end;
        document.getElementById('date-range-start').value = start.toISOString().split('T')[0];
        document.getElementById('date-range-end').value = end.toISOString().split('T')[0];
        aplicarFiltros();
    };

    atualizarLegenda('legend-mensal', ['Despesas mensais'], ['rgba(45, 80, 22, 0.7)']);
}

// Gráfico de Modalidades
function atualizarGraficoModalidade() {
    const modalidades = {
        'NUMERÁRIO': 0,
        'AGÊNCIA DE VIAGENS': 0,
        'CARTÃO CORPORATIVO': 0
    };

    dadosFiltrados.forEach(d => {
        if (modalidades.hasOwnProperty(d.modalidade)) {
            modalidades[d.modalidade] += parseNumero(d.valor);
        }
    });

    const labels = Object.keys(modalidades);
    const dados_valores = Object.values(modalidades);
    const cores = ['#1976d2', '#7b1fa2', '#388e3c'];

    const canvasModalidades = document.getElementById('chart-modalidades');
    canvasModalidades.style.height = '320px';
    canvasModalidades.height = 320;
    const ctx = canvasModalidades.getContext('2d');
    
    if (charts.modalidades) {
        charts.modalidades.destroy();
    }

    charts.modalidades = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: dados_valores,
                backgroundColor: cores,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                datalabels: {
                    formatter: (value, ctx) => {
                        let sum = 0;
                        ctx.dataset.data.forEach(v => sum += v);
                        return value > 0 ? ((value / sum) * 100).toFixed(1) + '%' : '';
                    },
                    color: '#fff',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    anchor: 'center',
                    align: 'center',
                    clamp: true,
                    offset: 0,
                    display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0
                }
            }
        }
    });

    const modalidadesCanvas = document.getElementById('chart-modalidades');
    modalidadesCanvas.onclick = (event) => {
        if (!charts.modalidades) return;
        const points = charts.modalidades.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if (!points.length) return;
        const index = points[0].index;
        const modalidade = charts.modalidades.data.labels[index];
        if (!modalidade) return;
        const selectModalidade = document.getElementById('filter-modalidade');
        selectModalidade.value = selectModalidade.value === modalidade ? '' : modalidade;
        aplicarFiltros();
    };

    atualizarLegenda('legend-modalidades', labels, cores.map(c => c));
}

// Atualizar Legenda
function atualizarLegenda(elementId, labels, cores) {
    const legend = document.getElementById(elementId);
    legend.innerHTML = '';
    
    labels.forEach((label, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const cor = document.createElement('div');
        cor.className = 'legend-color';
        cor.style.backgroundColor = cores[index].replace('0.7', '1');
        
        const texto = document.createElement('span');
        texto.textContent = label;
        
        item.appendChild(cor);
        item.appendChild(texto);
        legend.appendChild(item);
    });
}

// Gerar cores para gráficos
function gerarCores(quantidade) {
    const coresPaleta = [
        'rgba(45, 80, 22, 0.7)',
        'rgba(76, 175, 80, 0.7)',
        'rgba(255, 152, 0, 0.7)',
        'rgba(244, 67, 54, 0.7)',
        'rgba(33, 150, 243, 0.7)',
        'rgba(156, 39, 176, 0.7)',
        'rgba(0, 188, 212, 0.7)',
        'rgba(255, 193, 7, 0.7)',
        'rgba(63, 81, 181, 0.7)',
        'rgba(233, 30, 99, 0.7)'
    ];

    const cores = [];
    for (let i = 0; i < quantidade; i++) {
        cores.push(coresPaleta[i % coresPaleta.length]);
    }
    return cores;
}

// Atualizar Tabela de Lançamentos
function atualizarTabela() {
    const inicio = (paginaAtual - 1) * linhasPorPagina;
    const fim = inicio + linhasPorPagina;
    const registrosPagina = dadosFiltradosLancamentos.slice(inicio, fim);

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    registrosPagina.forEach((registro, index) => {
        const tr = document.createElement('tr');
        
        // Formatar data
        const data = parseDataBR(registro.data);
        const dataFormatada = data ? data.toLocaleDateString('pt-BR') : 'Data inválida';
        
        // Classe para modalidade
        let classeModalidade = 'modal-numerario';
        if (registro.modalidade === 'AGÊNCIA DE VIAGENS') classeModalidade = 'modal-agencia';
        else if (registro.modalidade === 'CARTÃO CORPORATIVO') classeModalidade = 'modal-cartao';

        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${registro.nome_funcionario}</td>
            <td>${registro.departamento}</td>
            <td><span class="table-modalidade ${classeModalidade}">${registro.modalidade}</span></td>
            <td><span class="table-categoria">${registro.categoria_despesa}</span></td>
            <td>${registro.descricao_despesa}</td>
            <td><strong>R$ ${parseNumero(registro.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            <td>
                <button class="btn-detalhes" onclick="mostrarDetalhes('${index}')">Ver</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });

    // Atualizar paginação
    const totalPaginas = Math.ceil(dadosFiltradosLancamentos.length / linhasPorPagina);
    document.getElementById('pagination-info').textContent = 
        `Página ${paginaAtual} de ${totalPaginas}`;
    
    document.getElementById('btn-prev-page').disabled = paginaAtual === 1;
    document.getElementById('btn-next-page').disabled = paginaAtual === totalPaginas;
}

// Filtrar tabela por busca
function filtrarTabela() {
    const busca = document.getElementById('search-lancamentos').value.toLowerCase();
    dadosFiltradosLancamentos = dadosFiltrados.filter(d => {
        const texto = `${d.data} ${d.nome_funcionario} ${d.departamento} ${d.modalidade} ${d.categoria_despesa} ${d.descricao_despesa} ${d.valor}`.toLowerCase();
        return texto.includes(busca);
    });
    paginaAtual = 1;
    atualizarTabela();
}

// Paginação
function proximaPagina() {
    const totalPaginas = Math.ceil(dadosFiltradosLancamentos.length / linhasPorPagina);
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        atualizarTabela();
        document.querySelector('.table-wrapper').scrollTop = 0;
    }
}

function paginaAnterior() {
    if (paginaAtual > 1) {
        paginaAtual--;
        atualizarTabela();
        document.querySelector('.table-wrapper').scrollTop = 0;
    }
}

// Mostrar Detalhes em Modal
function mostrarDetalhes(index) {
    const inicio = (paginaAtual - 1) * linhasPorPagina;
    const registro = dadosFiltrados[inicio + parseInt(index)];

    if (!registro) return;

    const data = parseDataBR(registro.data);
    const dataFormatada = data ? data.toLocaleDateString('pt-BR') : 'Data inválida';
    const valorFormatado = parseNumero(registro.valor).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="modal-field">
            <div class="modal-field-label">Data</div>
            <div class="modal-field-value">${dataFormatada}</div>
        </div>
        <div class="modal-field">
            <div class="modal-field-label">Funcionário</div>
            <div class="modal-field-value">${registro.nome_funcionario}</div>
        </div>
        <div class="modal-field">
            <div class="modal-field-label">Departamento</div>
            <div class="modal-field-value">${registro.departamento}</div>
        </div>
        <div class="modal-field">
            <div class="modal-field-label">Modalidade</div>
            <div class="modal-field-value">
                <span class="table-modalidade modal-${registro.modalidade.replace(/\\s+/g, '-').toLowerCase()}">
                    ${registro.modalidade}
                </span>
            </div>
        </div>
        <div class="modal-field">
            <div class="modal-field-label">Categoria</div>
            <div class="modal-field-value">${registro.categoria_despesa}</div>
        </div>
        <div class="modal-field">
            <div class="modal-field-label">Descrição</div>
            <div class="modal-field-value">${registro.descricao_despesa}</div>
        </div>
        <div class="modal-field">
            <div class="modal-field-label">Valor</div>
            <div class="modal-field-value" style="color: #2d5016; font-weight: bold; font-size: 1.2rem;">
                R$ ${valorFormatado}
            </div>
        </div>
    `;

    const modal = document.getElementById('modal-detalhes');
    modal.classList.add('show');
}

// Fechar Modal
function fecharModal() {
    const modal = document.getElementById('modal-detalhes');
    modal.classList.remove('show');
}

// Exportar XLSX simples
function exportarCSV() {
    const linhasParaExportar = Array.isArray(dadosFiltradosLancamentos) ? dadosFiltradosLancamentos : dadosFiltrados;

    if (!Array.isArray(linhasParaExportar) || linhasParaExportar.length === 0) {
        alert('Não há dados para exportar. Carregue um CSV ou aplique filtros que retornem resultados.');
        return;
    }

    const headers = ['Data', 'Funcionário', 'Departamento', 'Modalidade', 'Categoria', 'Descrição', 'Valor'];
    const rows = [headers];

    linhasParaExportar.forEach(d => {
        const data = parseDataBR(d.data);
        const dataFormatada = data ? data.toLocaleDateString('pt-BR') : d.data;
        const valor = parseNumero(d.valor);
        const valorFormatado = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        rows.push([
            dataFormatada,
            d.nome_funcionario || '',
            d.departamento || '',
            d.modalidade || '',
            d.categoria_despesa || '',
            d.descricao_despesa || '',
            valorFormatado
        ]);
    });

    const tableHtml = rows.map(row => {
        return '<tr>' + row.map(cell => `<td>${String(cell)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/\'/g, '&#39;')}</td>`).join('') + '</tr>';
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${tableHtml}</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const nomeArquivo = `despesas_viagem_${new Date().toISOString().split('T')[0]}.xls`;

    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Mudar de página (Dashboard/Lançamentos)
function mudaPagina(pagina) {
    // Atualizar menu ativo
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pagina) {
            item.classList.add('active');
        }
    });

    // Mostrar página correta
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    if (pagina === 'dashboard') {
        document.getElementById('dashboard-page').classList.add('active');
        document.querySelector('.page-title').textContent = 'Dashboard de Despesas';
    } else if (pagina === 'lancamentos') {
        document.getElementById('lancamentos-page').classList.add('active');
        document.querySelector('.page-title').textContent = 'Lançamentos';
        atualizarTabela();
    }
}

// Formatador de moeda
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}