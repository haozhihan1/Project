// 假设你已保存了最近一次提交的答案（如window.lastSubmitData），否则可从后端拉取
let lastSubmitData = null;

// 监听“分析”按钮
document.getElementById('btn-analyze').onclick = async function() {
  sidebarBtns.forEach(b => b.classList.remove('active'));
  this.classList.add('active');
  document.getElementById('question-area').style.display = 'none';
  document.getElementById('result').style.display = 'none';
  document.getElementById('analysis-area').style.display = 'block';

  // 如果没有答案，提示先完成测评
  if (!lastSubmitData) {
    document.getElementById('analysis-result').innerHTML = '<div style="color:#e53e3e;">请先完成测评并提交！</div>';
    return;
  }

  // 获取分析结果
  const res = await fetch('http://127.0.0.1:5000/api/submit', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({answers: lastSubmitData})
  });
  const data = await res.json();

  // 美观展示
  let html = `
    <div style="font-size:1.3rem;font-weight:bold;color:#2563eb;margin-bottom:18px;">测评分析报告</div>
    <div style="margin-bottom:18px;">
      <span style="font-weight:bold;">岗位推荐：</span>
      <span style="color:#1e40af;">${data['岗位推荐']}</span>
    </div>
    <div style="margin-bottom:18px;">
      <span style="font-weight:bold;">兴趣主型：</span>
      <span>${data['兴趣主型'].map(x=>x[0]+'('+x[1]+')').join('， ')}</span>
    </div>
    <div style="margin-bottom:18px;">
      <span style="font-weight:bold;">大五人格：</span>
      <span>${Object.entries(data['大五人格']).map(([k,v])=>`${k}：${v}`).join('， ')}</span>
    </div>
    <div style="margin-bottom:18px;">
      <span style="font-weight:bold;">能力分布：</span>
      <span>${Object.entries(data['能力分布']).map(([k,v])=>`${k}：${v}`).join('， ')}</span>
    </div>
    <div style="margin-bottom:18px;">
      <span style="font-weight:bold;">管理能力各维度：</span>
      <span>${Object.entries(data['维度平均分']).map(([k,v])=>`${k}：${v}`).join('， ')}</span>
    </div>
    <div style="color:#aaa;font-size:0.95rem;">如需详细报告，请联系管理员。</div>
  `;
  document.getElementById('analysis-result').innerHTML = html;
};

// 在提交测评时保存答案
window.submitAll = async function() {
  clearInterval(timer);
  document.getElementById('question-area').innerHTML = '';
  document.getElementById('result').innerText = '正在提交...';
  // 组装答案格式
  const submitData = questions.map((q, idx) => ({id: q.id, answer: answers[idx]}));
  lastSubmitData = submitData; // 保存本次答案
  const res = await fetch('http://127.0.0.1:5000/api/submit', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({answers: submitData})
  });
  const data = await res.json();
  document.getElementById('result').innerHTML = `<div>测评已提交，答题数量：${data.count}</div>`;
  document.getElementById('start-btn').style.display = 'block';
};
