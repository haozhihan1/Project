let questions = [];
let current = 0;
let answers = [];
let timer = null;
const DURATION = 15;

const btnTest = document.getElementById('btn-test');
const btnAnalyze = document.getElementById('btn-analyze');
const testArea = document.getElementById('test-area');
const analArea = document.getElementById('analysis-area');

// 侧边栏切换
function switchTab(tab) {
    btnTest.classList.toggle('active', tab === 'test');
    btnAnalyze.classList.toggle('active', tab === 'analyze');
    testArea.style.display = tab === 'test' ? 'block' : 'none';
    analArea.style.display = tab === 'analyze' ? 'block' : 'none';
}
btnTest.onclick = () => switchTab('test');
btnAnalyze.onclick = () => switchTab('analyze');

// 开始测试
document.getElementById('start-btn').onclick = async () => {
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    try {
        const res = await fetch('http://127.0.0.1:5000/api/questions');
        if (!res.ok) {
            throw new Error('无法获取问题列表');
        }
        questions = await res.json();
        current = 0;
        answers = Array(questions.length).fill(null);
        document.getElementById('loading').style.display = 'none';
        showQuestion();
    } catch (error) {
        alert(error.message);
        document.getElementById('start-btn').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
    }
};

// 一键完成
function fillAll() {
    questions.forEach((_, i) => answers[i] = Math.floor(Math.random() * 5) + 1);
    submitAll();
}

// 展示题目
function showQuestion() {
    clearInterval(timer);
    const area = document.getElementById('question-area');
    area.style.display = 'block';
    area.innerHTML = '';

    if (current >= questions.length) {
        submitAll();
        return;
    }

    const q = questions[current];
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
        <div class="question-title">${current + 1}/${questions.length}. ${q.content}</div>
        ${q.options.map((opt, i) => `
            <label class="option-label">
                <input type="radio" name="q" value="${i + 1}" ${answers[current] === i + 1 ? 'checked' : ''}> ${opt}
            </label>
        `).join('')}
        <div class="progress-bar"><div class="progress-inner" id="progress-inner"></div></div>
        <button class="next-btn" onclick="nextQ()">${current === questions.length - 1 ? '完成' : '下一题'}</button>
        <button class="fill-btn" onclick="fillAll()">一键完成</button>
    `;
    area.appendChild(card);

    // 选答案
    card.querySelectorAll('input[name="q"]').forEach(r => r.onchange = () => answers[current] = +r.value);

    // 计时条
    let sec = 0;
    timer = setInterval(() => {
        sec++;
        document.getElementById('progress-inner').style.width = Math.min(100, sec / DURATION * 100) + '%';
        if (sec >= DURATION) {
            current++;
            showQuestion();
        }
    }, 1000);
}

function nextQ() {
    if (answers[current] === null) {
        alert('请先选择答案');
        return;
    }
    clearInterval(timer);
    current++;
    showQuestion();
}

// 提交答案
async function submitAll() {
    clearInterval(timer);
    const payload = questions.map((q, i) => ({ id: q.id, answer: answers[i] }));
    try {
        const res = await fetch('http://127.0.0.1:5000/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: payload })
        });
        if (!res.ok) {
            throw new Error('提交失败');
        }
        const data = await res.json();
        switchTab('analyze');
        showAnalysis(data);
    } catch (error) {
        alert(error.message);
    }
}

// 展示分析结果
function showAnalysis(data) {
    const root = document.getElementById('analysis-area');
    root.innerHTML = '';

    // 1. 岗位适配雷达图
    const radarSection = document.createElement('div');
    radarSection.className = 'section';
    radarSection.innerHTML = `
        <h2>岗位适配雷达</h2>
        <canvas id="radar"></canvas>
        <p id="radar-description"></p>
    `;
    root.appendChild(radarSection);
    const radarCtx = document.getElementById('radar').getContext('2d');
    new Chart(radarCtx, {
        type: 'radar',
        data: {
            labels: ['战略思维', '团队领导', '执行管控', '跨部门协作'],
            datasets: [{
                label: '您的得分',
                data: [
                    data['维度平均分']['战略思维'],
                    data['维度平均分']['团队领导'],
                    data['维度平均分']['执行管控'],
                    data['维度平均分']['跨部门协作']
                ],
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: 'rgba(37, 99, 235, 1)',
                pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                pointBorderColor: '#fff'
            }]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    document.getElementById('radar-description').textContent = `综合适配度 ${data['维度平均分']['战略思维']}%，与“${data['岗位推荐']}”高度匹配。`;

    // 2. 能力分布柱状图
    const abilitySection = document.createElement('div');
    abilitySection.className = 'section';
    abilitySection.innerHTML = `
        <h2>能力分布</h2>
        <canvas id="ability-bars"></canvas>
    `;
    root.appendChild(abilitySection);
    const abilityCtx = document.getElementById('ability-bars').getContext('2d');
    new Chart(abilityCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(data['能力分布']),
            datasets: [{
                label: '您的能力得分',
                data: Object.values(data['能力分布']),
                backgroundColor: 'rgba(37, 99, 235, 0.5)',
                hoverBackgroundColor: 'rgba(37, 99, 235, 0.7)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    // 3. 兴趣类型饼图
    const interestSection = document.createElement('div');
    interestSection.className = 'section';
    interestSection.innerHTML = `
        <h2>兴趣类型分布</h2>
        <canvas id="interest-pie"></canvas>
        <div id="interest-explanation"></div>
    `;
    root.appendChild(interestSection);
    const interestCtx = document.getElementById('interest-pie').getContext('2d');
    const interestMap = {
        'R': { name: '现实型', description: '喜欢动手操作和工具使用，适合机械、工程、技术等领域。' },
        'I': { name: '研究型', description: '喜欢分析和探索新知识，适合科学研究、教育、数据分析等领域。' },
        'A': { name: '艺术型', description: '喜欢创造性和自由表达，适合艺术创作、设计、表演等领域。' },
        'S': { name: '社会型', description: '喜欢与人交流和帮助他人，适合社会服务、教育、心理咨询等领域。' },
        'E': { name: '企业型', description: '喜欢领导和管理，适合商业管理、市场营销、政治等领域。' },
        'C': { name: '常规型', description: '喜欢有条理和系统化的工作，适合行政管理、会计、法律等领域。' }
    };
    const interestData = [];
    const interestLabels = [];
    data['兴趣主型'].forEach(item => {
        const code = item[0];
        if (interestMap[code]) {
            interestData.push(item[1]);
            interestLabels.push(interestMap[code].name);
        }
    });
    new Chart(interestCtx, {
        type: 'pie',
        data: {
            labels: interestLabels,
            datasets: [{
                data: interestData,
                backgroundColor: ['#2563eb', '#1e40af', '#38a169', '#4f46e5', '#e54646', '#e59846']
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
    const interestExplanation = document.getElementById('interest-explanation');
    interestExplanation.innerHTML = data['兴趣主型'].map(item => {
        const code = item[0];
        return `<div class="interest-item">
                    <h3>${interestMap[code].name}</h3>
                    <p>${interestMap[code].description}</p>
                </div>`;
    }).join('');

    // 4. 大五人格折线图
    const bigfiveSection = document.createElement('div');
    bigfiveSection.className = 'section';
    bigfiveSection.innerHTML = `
        <h2>大五人格发展趋势</h2>
        <canvas id="bigfive-line"></canvas>
    `;
    root.appendChild(bigfiveSection);
    const bigfiveCtx = document.getElementById('bigfive-line').getContext('2d');
    new Chart(bigfiveCtx, {
        type: 'line',
        data: {
            labels: Object.keys(data['大五人格']),
            datasets: [{
                label: '您的得分',
                data: Object.values(data['大五人格']),
                borderColor: 'rgba(37, 99, 235, 1)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    // 5. 综合分析报告
    const reportSection = document.createElement('div');
    reportSection.className = 'section text-only';
    reportSection.innerHTML = `
        <h2>综合分析报告</h2>
        <div id="report-content"></div>
    `;
    root.appendChild(reportSection);
    const reportContent = document.getElementById('report-content');
    const averageScore = Object.values(data['维度平均分']).reduce((a, b) => a + b, 0) / Object.keys(data['维度平均分']).length;
    const strongAreas = Object.entries(data['能力分布']).filter(item => item[1] >= 80).map(item => `${item[0]} (${item[1]}%)`).join(', ');
    const improvementAreas = Object.entries(data['能力分布']).filter(item => item[1] < 70).map(item => `${item[0]} (${item[1]}%)`).join(', ');

    reportContent.innerHTML = `
        <p>您的综合评分为：${averageScore.toFixed(1)} / 100</p>
        <p>推荐岗位：${data['岗位推荐']}</p>
        <p>兴趣主型 Top3：${data['兴趣主型'].map(item => `${item[0]} (${item[1]}%)`).join(', ')}</p>
        <p>大五人格特质：${JSON.stringify(data['大五人格'], null, 2)}</p>
        <p>能力优势：${strongAreas || '无'}</p>
        <p>需要提升的领域：${improvementAreas || '无'}</p>
    `;

    // 样式美化
    reportContent.style.lineHeight = '1.6';
    reportContent.style.marginTop = '20px';
}