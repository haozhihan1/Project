from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

# 初始化数据库
def init_db():
    conn = sqlite3.connect('questions.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            options TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/api/questions', methods=['GET'])
def get_questions():
    conn = sqlite3.connect('questions.db')
    c = conn.cursor()
    c.execute('SELECT id, content, options FROM questions')
    all_data = [
        {"id": row[0], "content": row[1], "options": row[2].split('|')}
        for row in c.fetchall()
    ]
    conn.close()
    return jsonify(all_data)

@app.route('/api/submit', methods=['POST'])
def submit():
    data = request.json
    answers = data.get('answers', [])
    if not answers:
        return jsonify({"msg": "无答案", "count": 0}), 400

    # 计算管理能力得分
    manage_dims = {
        '战略思维': list(range(1, 21)),
        '团队领导': list(range(21, 41)),
        '执行管控': list(range(41, 61)),
        '跨部门协作': list(range(61, 81))
    }
    manage_scores = {k: 0 for k in manage_dims}
    for ans in answers:
        qid = ans['id']
        score = ans['answer']
        for dim, ids in manage_dims.items():
            if qid in ids:
                manage_scores[dim] += score
    manage_scores = {k: round(v * 100 / (20 * 5)) for k, v in manage_scores.items()}

    # 计算职业兴趣得分
    riasec_map = {
        'R': list(range(101, 111)),
        'I': list(range(111, 121)),
        'A': list(range(121, 131)),
        'S': list(range(131, 141)),
        'E': list(range(141, 151)),
        'C': list(range(151, 161))
    }
    riasec_scores = {k: 0 for k in riasec_map}
    for ans in answers:
        qid = ans['id']
        score = ans['answer']
        for dim, ids in riasec_map.items():
            if qid in ids:
                riasec_scores[dim] += score
    riasec_scores = {k: round(v * 100 / (10 * 5)) for k, v in riasec_scores.items()}
    interest_top3 = sorted(riasec_scores.items(), key=lambda x: -x[1])[:3]

    # 计算性格特质得分（大五人格）
    bigfive_map = {
        '外向性': [81, 83, 85, 87],
        '宜人性': [82, 84, 86, 88],
        '开放性': [89],
        '责任心': [90],
        '神经质': [91, 92, 93, 94, 95, 96, 97, 98, 99, 100]
    }
    bigfive_scores = {k: 0 for k in bigfive_map}
    for ans in answers:
        qid = ans['id']
        score = ans['answer']
        for dim, ids in bigfive_map.items():
            if qid in ids:
                bigfive_scores[dim] += score
    bigfive_scores = {k: round(v * 100 / (len(ids) * 5)) for k, v in bigfive_scores.items()}

    # 计算通用能力得分
    ability_map = {
        '沟通能力': [161, 165, 169, 173],
        '领导力': [162, 166, 170, 174],
        '执行力': [163, 167, 171, 175],
        '分析能力': [164, 168, 172, 176],
        '学习能力': [177, 178, 179, 180]
    }
    ability_scores = {k: 0 for k in ability_map}
    for ans in answers:
        qid = ans['id']
        score = ans['answer']
        for dim, ids in ability_map.items():
            if qid in ids:
                ability_scores[dim] += score
    ability_scores = {k: round(v * 100 / (len(ids) * 5)) for k, v in ability_scores.items()}

    # 返回结果
    return jsonify({
        "管理能力": manage_scores,
        "职业兴趣": riasec_scores,
        "性格特质": bigfive_scores,
        "通用能力": ability_scores
    })

if __name__ == '__main__':
    init_db()
    app.run(debug=True)